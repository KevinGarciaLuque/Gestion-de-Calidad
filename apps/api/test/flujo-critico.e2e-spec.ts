import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

/**
 * Cubre los flujos que, si se rompen, afectan directamente la confianza en
 * el sistema: autenticación, el flujo de aprobación de procesos y el
 * candado de negocio de riesgos críticos. No busca cobertura exhaustiva,
 * sino ser la red de seguridad mínima antes de desplegar.
 */
describe('Flujo crítico del SGC (e2e)', () => {
  let app: INestApplication<App>;
  let http: App;
  let token: string;
  let meId: string;
  let procesoId: string;
  const sufijo = Date.now().toString(36);

  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    http = app.getHttpServer() as App;

    const login = await request(http)
      .post('/api/auth/login')
      .send({
        email: process.env.SEED_ADMIN_EMAIL ?? 'admin@calidad360.local',
        password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin.123456',
      })
      .expect(200);
    token = login.body.accessToken;
    meId = login.body.usuario.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Autenticación', () => {
    it('rechaza credenciales inválidas', async () => {
      await request(http)
        .post('/api/auth/login')
        .send({ email: 'no-existe@calidad360.local', password: 'lo-que-sea' })
        .expect(401);
    });

    it('exige token para rutas protegidas', async () => {
      await request(http).get('/api/auth/me').expect(401);
    });

    it('/auth/me responde con el usuario autenticado', async () => {
      const res = await request(http).get('/api/auth/me').set(auth()).expect(200);
      expect(res.body.email).toBe(process.env.SEED_ADMIN_EMAIL ?? 'admin@calidad360.local');
      expect(Array.isArray(res.body.permisos)).toBe(true);
    });
  });

  describe('RBAC — permisos por rol', () => {
    it('un colaborador no puede configurar el motor de automatizaciones (403)', async () => {
      const email = `colaborador-${sufijo}@calidad360.local`;
      const crear = await request(http)
        .post('/api/usuarios')
        .set(auth())
        .send({ email, nombre: 'Colaborador CI', password: 'Colaborador.12345' })
        .expect(201);

      await request(http)
        .post(`/api/usuarios/${crear.body.usuario.id}/roles`)
        .set(auth())
        .send({ rolCodigo: 'COLABORADOR', tipoAlcance: 'GLOBAL' })
        .expect(201);

      const login = await request(http)
        .post('/api/auth/login')
        .send({ email, password: 'Colaborador.12345' })
        .expect(200);

      await request(http)
        .get('/api/automatizaciones/reglas')
        .set({ Authorization: `Bearer ${login.body.accessToken}` })
        .expect(403);
    });
  });

  describe('Procesos — flujo de aprobación', () => {
    it('crea un proceso, completa la ficha, la envía a revisión y la aprueba', async () => {
      const crear = await request(http)
        .post('/api/procesos')
        .set(auth())
        .send({
          codigo: `PR-CI-${sufijo}`,
          nombre: 'Proceso de prueba (CI)',
          tipo: 'APOYO',
          objetivo: 'Verificar el flujo de aprobación de principio a fin en la integración continua.',
        })
        .expect(201);
      procesoId = crear.body.proceso.id;
      expect(crear.body.proceso.estado).toBe('BORRADOR');

      await request(http)
        .put(`/api/procesos/${procesoId}/ficha`)
        .set(auth())
        .send({
          alcance: 'Alcance de prueba para CI.',
          entradas: [{ proveedor: 'Proveedor de prueba', insumo: 'Insumo de prueba' }],
          actividades: [{ orden: 1, actividad: 'Actividad de prueba' }],
          salidas: [{ salida: 'Salida de prueba' }],
          recursos: [{ tipo: 'PERSONAL', detalle: 'Personal de prueba' }],
        })
        .expect(200);

      await request(http).post(`/api/procesos/${procesoId}/enviar-revision`).set(auth()).expect(201);

      const aprobado = await request(http)
        .post(`/api/procesos/${procesoId}/aprobar`)
        .set(auth())
        .send({})
        .expect(201);
      expect(aprobado.body.proceso.estado).toBe('VIGENTE');
      expect(aprobado.body.versionVigente.numero).toBe(1);
    });

    it('no permite enviar a revisión una ficha sin actividades', async () => {
      const crear = await request(http)
        .post('/api/procesos')
        .set(auth())
        .send({
          codigo: `PR-CI-VACIO-${sufijo}`,
          nombre: 'Proceso sin ficha (CI)',
          tipo: 'APOYO',
          objetivo: 'Verificar la validación de ficha incompleta.',
        })
        .expect(201);

      await request(http)
        .post(`/api/procesos/${crear.body.proceso.id}/enviar-revision`)
        .set(auth())
        .expect(400);
    });
  });

  describe('Riesgos — candado de riesgo crítico', () => {
    it('no cierra un riesgo crítico sin responsable ni plan; sí una vez completados', async () => {
      expect(procesoId).toBeDefined();

      const crear = await request(http)
        .post('/api/riesgos')
        .set(auth())
        .send({
          codigo: `R-CI-${sufijo}`,
          tipo: 'RIESGO',
          procesoId,
          descripcion: 'Riesgo crítico de prueba para el candado de cierre.',
          probabilidadInherente: 5,
          impactoInherente: 5,
        })
        .expect(201);
      const riesgoId = crear.body.riesgo.id;
      expect(crear.body.riesgo.categoriaInherente).toBe('CRITICO');

      await request(http)
        .post(`/api/riesgos/${riesgoId}/cerrar`)
        .set(auth())
        .send({ comentario: 'Intento de cierre sin responsable ni plan (debe fallar).' })
        .expect(400);

      await request(http)
        .patch(`/api/riesgos/${riesgoId}`)
        .set(auth())
        .send({ responsableId: meId, planTratamiento: 'Plan de tratamiento de prueba.' })
        .expect(200);

      await request(http)
        .post(`/api/riesgos/${riesgoId}/cerrar`)
        .set(auth())
        .send({ comentario: 'Cierre con responsable y plan definidos.' })
        .expect(201);
    });
  });

  describe('Panel gerencial', () => {
    it('el dashboard responde con la forma esperada', async () => {
      const res = await request(http).get('/api/dashboard').set(auth()).expect(200);
      for (const clave of ['indicadores', 'riesgos', 'auditorias', 'hallazgos', 'acciones', 'documentos', 'mcc', 'radar']) {
        expect(res.body).toHaveProperty(clave);
      }
      expect(Array.isArray(res.body.radar)).toBe(true);
    });
  });
});

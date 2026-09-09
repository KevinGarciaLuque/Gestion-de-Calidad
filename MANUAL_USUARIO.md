# Manual de Usuario — Calidad 360 Hospitalaria

**Sistema de Gestión de Calidad (SGC) · ISO 9001**

Versión del sistema: MVP (Fases 0 a 10) · Documento actualizado: septiembre de 2026

---

## Cómo leer este manual

Este documento explica **cómo usar la aplicación**: para qué sirve cada módulo, quién
lo utiliza y cuál es el flujo de trabajo paso a paso.

> **No es lo mismo que la "Propuesta del Sistema de Gestión de Calidad".** Ese otro
> documento describe *todo* lo que se propuso construir (incluye módulos que todavía no
> están disponibles, como Eventos e Incidentes, Comités, Encuestas de Satisfacción o
> Servicios Subrogados). Este manual cubre **solo lo que ya está funcionando** en esta
> versión.

Cada módulo se explica con la misma estructura:

- **Qué es y para qué sirve**
- **Quién lo usa**
- **Flujo de trabajo** (los pasos, en orden)
- **Campos y estados importantes**
- **Consejos y errores frecuentes**

---

# 1. Primeros pasos

## 1.1 Ingresar al sistema

1. Abre la dirección web del sistema que te haya entregado el Departamento de Calidad
   (por ejemplo `https://gestion-calidad.up.railway.app`).
2. Escribe tu **correo institucional** y tu **contraseña**.
3. Pulsa **Iniciar sesión**.

Si es tu primer ingreso o te acaban de restablecer la clave, el sistema te pedirá
**cambiar la contraseña** antes de continuar. Elige una contraseña que solo tú conozcas.

Si olvidaste tu contraseña, contacta al **administrador del sistema de calidad**: él puede
restablecerla desde el módulo de Usuarios.

## 1.2 La pantalla principal

Al entrar verás:

- **Menú lateral izquierdo**: la lista de módulos a los que tienes acceso. En el
  teléfono aparece como un botón **☰** (arriba a la izquierda) que despliega el menú.
- **Cabecera superior**:
  - 🔔 **Campana de notificaciones** con un número: son tus alertas pendientes
    (vencimientos, tareas asignadas, escalamientos).
  - **Tu nombre / avatar**: al pulsarlo puedes ir a **Mi perfil** o **Cerrar sesión**.
- **Panel de calidad** (pantalla de inicio): el tablero gerencial con la situación
  general del SGC. Se explica en el capítulo 14.

## 1.3 Qué puedes ver y hacer: los roles

El sistema muestra **solo lo que te corresponde** según tu rol y tu área. Los roles son:

| Rol | Para qué sirve |
|---|---|
| **Super Administrador** | Configuración técnica: usuarios, roles, parámetros, respaldos. |
| **Administrador / Gestor de Calidad** | Opera todos los módulos, en todas las áreas. Es el "dueño" funcional del SGC. |
| **Responsable de Proceso** | Gestiona la información de **su** proceso o área (alcance restringido). |
| **Auditor Interno** | Programa de auditorías, listas de verificación, evidencias y hallazgos. |
| **Dirección / Gerencia** | Consulta de tableros, tendencias, reportes y acciones críticas. |
| **Colaborador** | Reporta incidentes, propone mejoras y carga evidencias autorizadas. |
| **Consulta / Auditor Externo** | Solo lectura, y por un tiempo limitado. |

> Si necesitas ver o editar algo y no lo encuentras en tu menú, probablemente tu rol no
> lo permite. Solicítalo al Departamento de Calidad.

## 1.4 Ideas que se repiten en todo el sistema

- **Semáforo** 🟢 🟡 🔴: verde = conforme / en meta; amarillo = requiere atención;
  rojo = urgente / fuera de meta.
- **Versionado y aprobación**: los procesos y los documentos se trabajan en
  **borrador**, se **envían a revisión**, y alguien con permiso los **aprueba**. La
  versión anterior queda como histórico.
- **Trazabilidad**: todo está conectado. Desde un proceso llegas a sus riesgos,
  indicadores, documentos, auditorías y acciones; y desde una no conformidad puedes
  saber qué auditoría la originó.
- **Evidencias**: en hallazgos, acciones y auditorías puedes **adjuntar archivos**
  (fotos, PDF, actas) como prueba objetiva.
- **Bitácora**: cada cambio importante queda registrado con usuario, fecha y detalle.
  No se puede borrar.

---

# 2. Estructura organizacional

**Módulo:** Administración → Estructura organizacional

## Qué es y para qué sirve

Define el "organigrama" del hospital: **Hospital / sede → Direcciones y subdirecciones →
Departamentos y servicios → Áreas operativas**. Los procesos, documentos, auditorías y
hallazgos se asocian a estas unidades, y sirve para **delimitar el alcance** de cada
Responsable de Proceso.

## Quién lo usa

Gestor de Calidad y Super Administrador.

## Flujo de trabajo

1. Entra a **Estructura organizacional**.
2. Pulsa **Nueva unidad** (o el botón para agregar debajo de una unidad existente).
3. Indica **código**, **nombre**, **tipo** (Hospital, Dirección, Departamento,
   Servicio, Área…) y, si aplica, el **responsable** de esa unidad.
4. Guarda. La unidad aparece en el árbol, colgando de su unidad "padre".

## Consejos

- **No borres unidades**: si una deja de usarse, **desactívala**. Así se conserva la
  historia (auditorías, documentos, procesos que existieron en ella).
- El árbol debe crearse **antes** de registrar procesos, porque cada proceso se asigna
  a un área.

---

# 3. Usuarios y roles

**Módulo:** Administración → Usuarios · Administración → Roles y permisos

## Qué es y para qué sirve

Dar de alta a las personas que usarán el sistema y decidir **qué puede hacer cada una**.

## Quién lo usa

Gestor de Calidad y Super Administrador.

## Flujo de trabajo — crear un usuario

1. Administración → **Usuarios** → **Nuevo usuario**.
2. Escribe **nombre** y **correo institucional**. El sistema genera una contraseña
   temporal (o defines una).
3. Guarda. El usuario ya puede ingresar, pero **todavía no puede hacer nada** hasta que
   le asignes un rol.
4. En la fila del usuario, abre **Gestionar roles**.
5. Elige el **rol** (por ejemplo "Responsable de Proceso") y el **alcance**:
   - **Global**: ve y actúa sobre todo el hospital (Calidad, Dirección).
   - **Unidad**: limitado a un departamento/servicio y todo lo que cuelga de él.
   - **Proceso**: limitado a un proceso concreto.
6. Para un **auditor externo** o accesos temporales, define una **fecha de expiración**:
   pasada esa fecha, el rol deja de tener efecto automáticamente.

## Flujo de trabajo — restablecer contraseña / desactivar

- **Restablecer contraseña**: genera una nueva clave temporal; el usuario deberá
  cambiarla al ingresar.
- **Desactivar usuario**: bloquea el acceso sin borrar su historial (quién hizo qué
  sigue registrado).

## Consejos

- Una persona puede tener **varios roles con distinto alcance** (por ejemplo,
  Responsable del Proceso A y también Auditor Interno).
- Tras 5 intentos fallidos de contraseña, la cuenta se bloquea 15 minutos.

---

# 4. Mapa de Procesos

**Módulo:** Procesos

## Qué es y para qué sirve

Es la **puerta de entrada al SGC**. Muestra los procesos del hospital clasificados en
tres columnas —**Estratégicos, Misionales y de Apoyo**— y, para cada uno, su **ficha de
caracterización**: objetivo, responsable, entradas, actividades, salidas y recursos.

Sirve para responder: *¿qué procesos tenemos?, ¿quién es responsable?, ¿cómo funciona
cada uno?*

## Quién lo usa

- **Gestor de Calidad**: crea procesos, revisa y aprueba fichas.
- **Responsable de Proceso**: mantiene actualizada la ficha de su proceso.
- Los demás roles: solo consulta.

## Flujo de trabajo — registrar un proceso nuevo

1. Entra a **Procesos** → **Nuevo proceso**.
2. Completa la **identificación**:
   - **Código** (por ejemplo `PR-MIS-01`) y **nombre**.
   - **Tipo**: Estratégico, Misional o de Apoyo.
   - **Objetivo** del proceso.
   - **Área** responsable y **responsable** (titular) y **suplente**.
3. Guarda. El proceso se crea con una **ficha versión 1 en estado Borrador**.

### Completar la ficha de caracterización

4. Abre el proceso y ve a la pestaña **Ficha**.
5. Rellena cada sección (puedes agregar varias filas en cada una):
   - **Alcance**: qué incluye y qué no incluye el proceso.
   - **Entradas**: proveedor, insumo y requisitos de cada entrada.
   - **Actividades**: el paso a paso (orden, actividad, responsable, punto de control).
   - **Salidas**: producto/servicio, registro que lo evidencia y cliente que lo recibe.
   - **Recursos**: personas, equipos, infraestructura, información.
   - **Notas** adicionales.
6. Guarda. Se conserva como **borrador**; puedes seguir editando.

### Flujo de aprobación de la ficha

7. Cuando la ficha esté lista, pulsa **Enviar a revisión**. Pasa a estado
   **En revisión** y ya no se edita.
8. El revisor (Calidad) revisa y elige:
   - **Devolver al responsable** con un comentario (vuelve a Borrador para corregir).
   - **Aprobar y publicar esta versión**: la ficha queda **Aprobada / vigente**, la
     versión anterior se marca **Obsoleta** y se fija la **próxima fecha de revisión**
     (por defecto a 12 meses).

### Actualizar una ficha ya aprobada

9. Abre el proceso y pulsa **Proponer nueva versión**: se crea una copia de la ficha
   aprobada como nuevo borrador (versión 2, 3, …) y repites el flujo desde el paso 5.

## Relaciones entre procesos

En la pestaña **Interacciones** puedes registrar qué procesos son **proveedores** o
**clientes** internos de este (por ejemplo, "Farmacia" es proveedor de "Hospitalización").

## Estados y semáforo

| Semáforo | Significado |
|---|---|
| 🔴 Rojo | El proceso no tiene responsable, o no tiene una ficha aprobada. |
| 🟡 Amarillo | La ficha aprobada tiene la revisión **vencida**. |
| 🟢 Verde | Todo en orden. |

## Consejos

- Empieza con pocos procesos bien caracterizados antes de cargar todos.
- El **responsable** del proceso es quien recibirá las alertas y a quien se le
  escalan las tareas vencidas de ese proceso.

---

# 5. Indicadores / KPI

**Módulo:** Indicadores

## Qué es y para qué sirve

Medir el **desempeño** de los procesos: definir indicadores con su **meta**, registrar
el resultado en cada **periodo** y ver si se cumple (semáforo) y cómo evoluciona
(tendencia).

## Quién lo usa

- **Gestor de Calidad**: define indicadores.
- **Responsable de captura** (normalmente el Responsable de Proceso): registra las
  mediciones periódicas.
- **Responsable de análisis**: explica los resultados fuera de meta.

## Flujo de trabajo — crear un indicador

1. **Indicadores** → **Nuevo indicador**.
2. Completa:
   - **Código**, **nombre** y **objetivo** (qué pretende medir).
   - **Proceso** al que pertenece.
   - **Frecuencia**: Mensual, Bimestral, Trimestral, Semestral o Anual.
   - **Forma de cálculo**:
     - **Numerador / denominador** (por ejemplo: pacientes con doble verificación ÷
       total de pacientes) y si se **expresa como porcentaje**; o
     - **valor directo** (un número que se captura tal cual).
   - **Unidad** (%, días, casos…).
   - **Sentido**: *Creciente* (más alto es mejor) o *Decreciente* (más bajo es mejor).
   - **Meta** y **umbral amarillo** (el límite de tolerancia antes del rojo).
   - **Responsable de captura** y **responsable de análisis**.
3. Guarda.

## Flujo de trabajo — registrar una medición

1. Abre el indicador → pestaña **Mediciones** → **Registrar medición**.
2. Elige el **periodo** (año + mes/trimestre según la frecuencia).
3. Escribe el **numerador y denominador** (o el valor directo). El sistema muestra
   una **vista previa** del valor calculado y del semáforo.
4. Guarda. La medición aparece en la tendencia.

### Semáforo de la medición

- 🟢 **Verde**: cumple la meta.
- 🟡 **Amarillo**: no cumple la meta pero está dentro del umbral de tolerancia.
- 🔴 **Rojo**: fuera del umbral.

## Flujo de trabajo — analizar un resultado fuera de meta

1. En una medición amarilla o roja, pulsa **Analizar**.
2. Escribe el **análisis** (por qué se dio ese resultado) y un **plan de acción**.
3. Si el plan requiere tareas concretas, usa **Crear acción**: se abre el formulario
   de Acciones (CAPA) con el origen "Indicador" ya seleccionado (ver capítulo 9).

## Otras vistas

- **Tendencia**: gráfico de barras con la línea de meta.
- **Definición**: los parámetros del indicador (editable por Calidad).
- **Consolidado anual**: todos los indicadores y su cumplimiento del año.

## Alertas automáticas

El sistema avisa cuando: hay una **captura pendiente** del periodo, un indicador lleva
**varios periodos fuera de meta** (reincidente) o un resultado **fuera de meta sin
análisis**.

---

# 6. Riesgos y Oportunidades

**Módulo:** Riesgos

## Qué es y para qué sirve

Identificar los **riesgos** (y oportunidades) de cada proceso, **evaluarlos** con la
matriz institucional (probabilidad × impacto), definir **controles y plan de
tratamiento**, y **revisarlos** periódicamente.

## Quién lo usa

- **Gestor de Calidad**: configura la matriz, ve todos los riesgos, los cierra.
- **Responsable de Proceso**: registra y trata los riesgos de su proceso.

## La matriz de evaluación

**Riesgos → Matriz** (solo Calidad). Define:

- La **escala de probabilidad** y la **escala de impacto** (por ejemplo de 1 a 5, con
  su etiqueta y descripción).
- Los **umbrales**: a partir de qué nivel (probabilidad × impacto) un riesgo es
  **Medio**, **Alto** o **Crítico**.
- Cada cuántos **meses** debe revisarse un riesgo por defecto.

> Al cambiar la matriz, **todos los riesgos se reclasifican automáticamente**.

## Flujo de trabajo — registrar un riesgo

1. **Riesgos** → **Nuevo riesgo** (o desde la pestaña *Riesgos* de un proceso).
2. Completa:
   - **Tipo**: Riesgo u Oportunidad.
   - **Proceso**, **descripción**, **causa** y **consecuencia** posibles.
3. **Evaluación inherente** (el riesgo "en crudo", sin considerar controles):
   elige **probabilidad** e **impacto**. El sistema calcula el **nivel** y la
   **categoría** (Bajo / Medio / Alto / Crítico).
4. **Controles y tratamiento**:
   - Describe los **controles** que ya existen y su **eficacia**.
   - Define el **plan de tratamiento**, su **responsable** y la **fecha compromiso**.
5. **Evaluación residual** (opcional): vuelve a evaluar probabilidad e impacto
   *considerando* los controles. Esta es la categoría "efectiva" del riesgo.
6. Guarda.

## Flujo de trabajo — revisar y cerrar

- **Reevaluar**: registra una nueva evaluación residual (por ejemplo tras aplicar el
  plan). Queda en el historial de revisiones.
- **Revisar**: deja constancia de que se revisó el riesgo en la fecha programada y
  reprograma la siguiente revisión.
- **Cerrar**: marca el riesgo como cerrado.

> ⚠️ **Candado de negocio:** no puedes cerrar un riesgo de categoría **Alto o Crítico**
> si no tiene **responsable** y **plan de tratamiento** definidos. Primero completa
> esos datos.

## Otras vistas

- **Mapa de calor**: cuadrícula probabilidad × impacto con los riesgos ubicados.
- **Transversales**: riesgos similares que aparecen en **varios procesos** a la vez.

## Estados

Identificado → En tratamiento → Monitoreado → Cerrado. (O **Materializado** si el
riesgo llegó a ocurrir.)

---

# 7. Control Documental

**Módulo:** Control documental

## Qué es y para qué sirve

Gestionar los **documentos del SGC** (políticas, manuales, procedimientos, protocolos,
formatos…) con **control de versiones**, **flujo de aprobación**, **archivo adjunto**
y **fechas de vigencia y próxima revisión**. Incluye la **Lista Maestra**.

## Quién lo usa

- **Gestor de Calidad**: crea, revisa y aprueba documentos.
- **Propietario del documento** (Responsable de Proceso): elabora y actualiza sus
  documentos.
- Todos los roles: consultan y descargan los documentos vigentes.

## Flujo de trabajo — crear un documento

1. **Control documental** → **Nuevo documento**.
2. Completa:
   - **Código**, **nombre** y **tipo** (Política, Manual, Procedimiento, Protocolo,
     Instructivo, Formato, Registro, Guía, Lista maestra, Externo).
   - A qué **proceso** o **área** pertenece (o si es **institucional**).
   - **Propietario** (quien lo mantiene).
   - **Restringido** si solo debe verlo el propietario y Calidad.
   - **Palabras clave** para buscarlo.
3. Guarda. Se crea la **versión 1 en Borrador**.

## Flujo de trabajo — cargar y aprobar una versión

4. Abre el documento → pestaña **Versiones**.
5. Edita los **metadatos de la versión** (motivo del cambio) y **sube el archivo**
   (PDF, Word, Excel, imagen o texto; hasta 25 MB). El sistema guarda una huella
   (hash) del archivo.
6. Pulsa **Enviar a revisión** (exige que haya un archivo cargado).
7. El revisor **devuelve** (con comentario) o **aprueba**.
8. Al **aprobar**: la versión queda **Vigente**, la anterior pasa a **Obsoleta**, y se
   fijan la **fecha de vigencia** y la **próxima revisión**.

## Flujo de trabajo — nueva versión de un documento vigente

9. Pulsa **Proponer nueva versión**: se crea un nuevo borrador que **hereda el archivo**
   de la versión vigente. Súbelo actualizado y repite el flujo.

## Lista Maestra

Pestaña **Lista maestra**: tabla con todos los documentos, su versión vigente, fecha de
vigencia y próxima revisión. Se puede exportar (ver capítulo 15).

## Alertas automáticas

El sistema avisa al propietario **30, 15 y 7 días antes** de la próxima revisión, y
avisa al propietario y a Calidad cuando un documento vigente **ya venció** su revisión.

---

# 8. Auditorías

**Módulo:** Auditorías

## Qué es y para qué sirve

Planificar y ejecutar las **auditorías internas** (y registrar las externas): el
**programa anual**, el **plan** de cada auditoría, la **lista de verificación**
(checklist), la generación de **hallazgos** y el **informe**.

## Quién lo usa

- **Auditor Interno** y **Gestor de Calidad**: planifican y ejecutan.
- **Auditor líder** y **equipo auditor**: ejecutan su auditoría.
- Auditado (Responsable de Proceso): consulta y responde los hallazgos.

## Flujo de trabajo — programa anual

1. **Auditorías** → crea el **Programa** del año (nombre, objetivo).
2. Cuando esté completo, pulsa **Aprobar programa**.

## Flujo de trabajo — una auditoría

1. Crea la **auditoría**: código, **tipo** (Interna / Externa / Seguimiento),
   **proceso o área** a auditar, **objetivo**, **alcance**, **criterios** (normas,
   procedimientos), **auditor líder** y **equipo**, **fecha planificada**.
2. En la pestaña **Checklist**, agrega los **ítems** a verificar (cada uno es un
   criterio o pregunta).
3. Pulsa **Iniciar** la auditoría → pasa a **En curso**.
4. Durante la ejecución, registra el **resultado de cada ítem**:
   **Cumple / No cumple / Observación / No aplica**, con **notas** y, si quieres,
   **evidencias adjuntas**.
5. En un ítem **No cumple** u **Observación**, pulsa **Generar hallazgo**: se crea un
   hallazgo (código `H-AAAA-NNN`) ligado a ese ítem (ver capítulo 9).
6. Pulsa **Finalizar ejecución** → pasa a **Ejecutada** y se genera un **resumen
   automático** con los resultados.
7. En la pestaña **Informe**, edita el **resumen** y las **conclusiones**.
8. Pulsa **Aprobar informe** → **Informe aprobado**.
9. Pulsa **Cerrar auditoría**. *Requiere que todos los hallazgos abiertos tengan un
   responsable asignado.*

## Otras acciones

- **Reprogramar**: cambia la fecha planificada y registra el motivo (queda histórico).
- **Cancelar**: anula la auditoría.

## Alertas automáticas

El equipo auditor recibe recordatorios **15, 7 y 1 día antes** de la fecha planificada,
y una alerta si la auditoría **pasó su fecha y sigue sin ejecutarse**.

---

# 9. Hallazgos y No Conformidades

**Módulo:** Hallazgos y NC

## Qué es y para qué sirve

Gestionar las **desviaciones** detectadas (en auditorías, indicadores, quejas,
incidentes, inspecciones o la revisión por la dirección): registrarlas, **analizar la
causa raíz**, definir un **plan**, ejecutarlo y **verificar que fue eficaz** antes de
cerrar.

## Quién lo usa

- **Gestor de Calidad**: valida los hallazgos y verifica la eficacia.
- **Responsable del hallazgo** (del proceso afectado): analiza la causa y ejecuta el
  plan.
- **Auditores**: crean hallazgos.

## El ciclo de vida de un hallazgo

```
Abierto → En análisis → Plan aprobado → En ejecución → Pendiente de eficacia → Cerrado
                                                                              ↘ Reabierto
```

## Flujo de trabajo paso a paso

1. **Registro**: el hallazgo se crea desde una auditoría (**Generar hallazgo**) o
   manualmente (**Nuevo hallazgo**). Datos: **origen**, **proceso/área**,
   **descripción**, **clasificación** (No conformidad mayor / menor, Observación,
   Oportunidad de mejora), **requisito** relacionado, **evidencia**, **prioridad**.

2. **Validar** (Calidad): pulsa **Validar el hallazgo**. Se exige que tenga
   **responsable** y **fecha compromiso**. Se registra la **corrección inmediata** (la
   contención mientras se resuelve el fondo). Pasa a **En análisis**.

3. **Análisis de causa** (pestaña *Análisis de causa*): elige la metodología y
   complétala:
   - **5 porqués**: cadena de preguntas hasta la causa raíz.
   - **Ishikawa** (espina de pescado): causas por categorías (personas, métodos,
     materiales, equipos, entorno, medición).
   - **Lluvia de causas y validación**.
   Registra la **causa inmediata**, la **causa contribuyente** y la **causa raíz**.

4. **Plan de acción** (pestaña *Plan de acción*): describe qué se hará para eliminar la
   causa raíz.

5. **Aprobar plan** (Calidad): se exige que exista **causa raíz** y **plan**. Pasa a
   **Plan aprobado**.

6. **Iniciar ejecución** → **En ejecución**. Aquí se crean las **acciones (CAPA)**
   concretas desde la misma pestaña (ver capítulo 10).

7. **Completar acciones**: cuando todas las acciones estén **verificadas o
   canceladas**, pulsa este botón. Pasa a **Pendiente de eficacia**.

8. **Verificar eficacia** (Calidad): comprueba (con evidencia, con una nueva medición,
   con una auditoría de seguimiento) si el problema **realmente se resolvió**:
   - **Eficaz** → el hallazgo se **Cierra**.
   - **No eficaz** → el hallazgo se **Reabre** y se vuelve a analizar.

9. **Reabrir**: un hallazgo cerrado puede reabrirse si el problema reaparece
   (se registra el motivo).

## Línea de tiempo

La pestaña **Historial** muestra cada transición, quién la hizo y cuándo, además de los
**comentarios** que agregue el equipo.

---

# 10. Planes de Mejora y Acciones (CAPA)

**Módulo:** Planes y acciones

## Qué es y para qué sirve

Gestionar las **acciones concretas y rastreables**: correcciones, acciones correctivas,
tratamientos de riesgo y mejoras. Cada acción tiene un **responsable**, una **fecha
compromiso**, un **% de avance con historial** y una **verificación de eficacia**.

## Quién lo usa

- **Gestor de Calidad**: crea acciones, verifica eficacia.
- **Responsable de la acción**: la ejecuta y reporta el avance.
- **Colaboradores**: pueden ver las acciones en las que participan.

## Flujo de trabajo — crear una acción

Las acciones normalmente **nacen de otro módulo**:

- Desde un **hallazgo** (pestaña *Plan de acción*).
- Desde un **riesgo** (pestaña *Acciones*).
- Desde una **medición de indicador** fuera de meta (**Crear acción**).
- Desde un registro **MCC**.
- O sueltas, desde **Planes y acciones → Nueva acción**, indicando el origen
  (Comité, inspección, etc.).

Datos: **tipo** (Corrección / Acción correctiva / Tratamiento de riesgo / Mejora),
**descripción**, **resultado esperado**, **responsable** y **colaboradores**,
**fecha compromiso**, **prioridad**, **evidencia requerida**.

## Flujo de trabajo — seguimiento

1. Abre la acción → pestaña **Seguimiento**.
2. Registra el **% de avance** con un comentario. Cada actualización queda en el
   historial. Al llegar a **100 %**, la acción pasa a **Completada**.
3. Adjunta las **evidencias** en la pestaña correspondiente.
4. **Verificar eficacia** (Calidad): si la acción logró su resultado esperado →
   **Verificada** (queda cerrada). Si no → vuelve a **En curso**.

## Estados

Pendiente → En curso → Completada → Verificada. (O **Cancelada**, con motivo.)

## Alertas automáticas

- Acción **vencida**: escala en el tiempo — **día 1** al responsable, **día 3** a la
  jefatura del proceso, **día 7** a Gestión de Calidad.
- Acción **por vencer** (7 y 3 días antes).
- Acción **completada sin verificar** (aviso a Calidad).

---

# 11. Mejora Continua (MCC)

**Módulo:** Mejora continua

## Qué es y para qué sirve

Recoger **propuestas de mejora** de cualquier colaborador y convertir cada una en un
**caso trazable** hasta su cierre, con responsable, evaluación y **lección aprendida**.

## Quién lo usa

- **Cualquier Colaborador**: propone.
- **Gestor de Calidad**: clasifica, decide y cierra.

## El ciclo de vida

```
Nuevo → En revisión → Aceptado ─→ En ejecución → Verificación → Cerrado
                    ↘ No procede
```

## Flujo de trabajo

1. **Mejora continua** → **Nueva propuesta**: título, descripción, **origen**
   (Colaborador, Área, Encuesta, Indicador, Auditoría, Comité…) y detalle del origen.
2. **Calidad decide** (**Decidir**): indica si **procede** o **no procede**, con la
   **justificación**, el **impacto** estimado y la **prioridad**.
   - Si **no procede**, el registro se cierra con la justificación.
3. Si procede: **Iniciar ejecución**. Aquí se crean las **acciones** necesarias
   (capítulo 10).
4. Cuando las acciones estén listas: **Pasar a verificación**.
5. **Cerrar el registro**: escribe la **evaluación del resultado** y el
   **aprendizaje / lección** que deja para el resto de la organización.

Los **comentarios** y la línea de tiempo quedan registrados.

---

# 12. Calendario

**Módulo:** Calendario

## Qué es y para qué sirve

Reúne en una sola vista **todas las fechas clave del SGC**, para no depender de
recordatorios sueltos.

## Qué muestra

- **Auditorías** (por su fecha planificada).
- **Revisiones documentales** (próxima revisión de la versión vigente).
- **Revisiones de riesgo** (fecha de revisión programada).
- **Compromisos** de acciones y hallazgos (fecha compromiso).
- **Cierres de captura de indicadores** (fin del periodo vigente).

## Cómo se usa

- **Vista Mes**: cuadrícula del calendario; cada evento es un punto de color.
- **Vista Lista**: los próximos 12 meses en orden, con "Vencido" en rojo si ya pasó.
- Al pulsar un evento, te lleva al módulo correspondiente.

**Gestor de Calidad y Dirección** ven todos los eventos del hospital; los demás roles
ven **solo los suyos** (los de sus procesos, sus documentos, sus tareas).

---

# 13. Notificaciones y Motor de Automatizaciones

## 13.1 Mis notificaciones

**En la cabecera:** la campana 🔔 muestra el número de alertas **no leídas**. Al pulsarla
ves las últimas; con **Ver todas** entras a la página **Mis notificaciones**, donde
puedes filtrar **Todas / No leídas** y marcarlas como leídas.

Cada notificación te lleva, al pulsarla, al elemento que la originó (la acción, el
documento, el riesgo…).

## 13.2 El motor de automatizaciones

**Módulo:** Administración → Automatizaciones *(solo Gestor de Calidad)*

El motor se ejecuta **automáticamente cada día a las 07:00** y evalúa una lista de
**reglas**. También puede lanzarse a mano con **Ejecutar ahora**.

### Reglas disponibles

| Regla | Qué vigila |
|---|---|
| Acciones vencidas | Acción pasada de fecha; **escala** día 1 → responsable, día 3 → jefatura, día 7 → Calidad. |
| Acciones por vencer | Recuerda al responsable 7 y 3 días antes. |
| Acciones completadas sin verificar | Avisa a Calidad si llevan días esperando verificación. |
| Hallazgos con compromiso vencido | Notifica y escala igual que las acciones. |
| Hallazgos sin responsable | Avisa a Calidad de hallazgos abiertos sin responsable. |
| Revisión de riesgo próxima o vencida | Recuerda al responsable 30/15/7 días antes; avisa si venció. |
| Riesgo alto/crítico sin tratamiento | Avisa a Calidad de riesgos graves sin responsable o sin plan. |
| Documento próximo a revisión | Avisa al propietario 30/15/7 días antes. |
| Documento vencido | Avisa al propietario y a Calidad. |
| Captura de indicador pendiente | Recuerda al responsable de captura los periodos sin registrar. |
| Auditoría próxima o vencida | Recuerda al equipo auditor 15/7/1 día antes. |

### Configurar una regla

1. En **Automatizaciones**, cada regla tiene un interruptor para **activarla o
   desactivarla**.
2. Pulsa **Configurar** para ajustar:
   - **Días de aviso** (por ejemplo, cambiar 30/15/7 por otros valores).
   - **Escalamiento** (a quién y a los cuántos días).
   - **Enviar también por correo** (si el hospital tiene el correo configurado).

### Última ejecución

La tarjeta superior muestra cuándo corrió el motor por última vez y cuántas
notificaciones generó.

---

# 14. Panel de Calidad (Dashboard Gerencial)

**Módulo:** Panel (pantalla de inicio)

## Qué es y para qué sirve

Da la **fotografía del SGC en un vistazo** y, sobre todo, **señala prioridades**. Está
pensado para la Dirección y para el Departamento de Calidad.

## Qué contiene

### Tarjetas de prioridad

Cumplimiento general de KPI · Indicadores fuera de meta · Riesgos críticos ·
Auditorías del año · No conformidades abiertas y vencidas · Acciones vencidas ·
Documentos por revisar · Mejora continua.

**Cada tarjeta es un enlace**: al pulsarla te lleva al módulo correspondiente.

### Gráficos

Semáforo de indicadores · Riesgos por categoría · Hallazgos por estado ·
Acciones por estado.

### Radar de Calidad

Alertas "inteligentes" que combinan información de varios módulos, por ejemplo:

- *"Farmacia acumula 3 acciones vencidas."*
- *"IND-EST-001 lleva 2 periodos fuera de meta."*
- *"Hospitalización tiene 2 riesgos alto/crítico sin tratamiento."*
- *"El documento PR-XX-03 vencerá en 5 días."*
- *"El requisito 7.5 tiene hallazgos abiertos en 3 procesos."*
- *"2 auditorías planificadas siguen sin ejecutarse."*

El panel se **actualiza solo** cada pocos minutos.

---

# 15. Reportes y Salidas

**Módulo:** Reportes

## Qué es y para qué sirve

Generar documentos **listos para imprimir, revisar o enviar**, sin rehacer información
a mano.

## Listados descargables (CSV para Excel)

| Reporte | Contenido |
|---|---|
| Listado de procesos | Inventario de procesos con responsable, estado y próxima revisión. |
| Matriz de indicadores | Indicadores activos con meta, último resultado y semáforo. |
| Matriz de riesgos | Riesgos por proceso, con nivel inherente y residual. |
| Lista maestra de documentos | Documentos, versión vigente, vigencia y próxima revisión. |
| Programa anual de auditorías | Auditorías planificadas y su estado de ejecución. |
| Listado de hallazgos | Hallazgos con clasificación, responsable, compromiso y estado. |
| Estado de acciones | Acciones CAPA con origen, avance, compromiso y estado. |

Cada reporte tiene dos botones:

- **Ver**: abre la tabla en pantalla.
- **CSV**: descarga el archivo para abrirlo en Excel.

## Informe Ejecutivo de Calidad

Botón **Abrir informe imprimible**. Es un **resumen consolidado** (indicadores, riesgos,
auditorías, hallazgos, acciones, documentos y radar) con formato de informe y líneas de
firma, pensado para la **revisión por la dirección**.

Desde esa vista, el botón **Imprimir / Guardar PDF** usa el diálogo de impresión del
navegador: elige "Guardar como PDF" para obtener el archivo.

---

# 16. Bitácora

**Módulo:** Administración → Bitácora

## Qué es y para qué sirve

Es el **registro inmutable** de todo lo que pasa en el sistema: quién hizo qué, cuándo,
y qué cambió (valor anterior / valor nuevo). **No se puede editar ni borrar.**

## Cómo se usa

Filtra por **acción** (por ejemplo `hallazgo.validar`) y por **rango de fechas**.
Expande una fila para ver el detalle del cambio.

Sirve como **evidencia de trazabilidad** ante auditorías internas y externas.

---

# 17. Mi Perfil

Desde tu nombre (arriba a la derecha) → **Mi perfil**:

- Ver tus datos y tus roles.
- **Cambiar tu contraseña**.

---

# 18. Preguntas frecuentes

**No veo un módulo en el menú.**
Tu rol no tiene permiso para ese módulo, o tu alcance no incluye esa área. Solicítalo
al Departamento de Calidad.

**No puedo editar una ficha / un documento.**
Probablemente está **En revisión** o **Aprobado/Vigente**. Para cambiarlo, usa
**Proponer nueva versión**.

**No puedo cerrar un riesgo.**
Si es Alto o Crítico, primero debe tener **responsable** y **plan de tratamiento**.

**No puedo cerrar una auditoría.**
Todos los hallazgos abiertos de esa auditoría deben tener un **responsable asignado**.

**No puedo completar las acciones de un hallazgo.**
Todas las acciones ligadas deben estar **Verificadas o Canceladas**.

**Subí un archivo y no aparece / da error.**
Revisa que sea PDF, Office, imagen o texto y que pese **menos de 25 MB**.

**¿Cada cuánto llegan las alertas?**
El motor corre **todos los días a las 07:00**. Las notificaciones internas aparecen en
la campana; el correo solo si el hospital lo tiene configurado.

**¿La contraseña temporal caduca?**
No caduca, pero el sistema te obliga a cambiarla en el primer ingreso.

---

# 19. Glosario

| Término | Significado |
|---|---|
| **SGC** | Sistema de Gestión de Calidad. |
| **KPI / Indicador** | Medida del desempeño de un proceso frente a una meta. |
| **Riesgo inherente** | Nivel del riesgo sin considerar los controles. |
| **Riesgo residual** | Nivel del riesgo después de aplicar los controles. |
| **No conformidad (NC)** | Incumplimiento de un requisito. |
| **Hallazgo** | Desviación detectada (puede ser NC, observación u oportunidad). |
| **CAPA** | Corrección y Acción Correctiva/Preventiva. |
| **Corrección inmediata** | Acción de contención mientras se resuelve la causa raíz. |
| **Causa raíz** | El motivo de fondo que, si se elimina, evita que el problema se repita. |
| **Verificación de eficacia** | Comprobar que la acción realmente resolvió el problema. |
| **Lista Maestra** | Inventario de todos los documentos controlados y su versión vigente. |
| **Alcance (de permisos)** | Hasta dónde llega lo que un usuario puede ver y hacer (global, una unidad o un proceso). |
| **Escalamiento** | Subir una alerta a un nivel superior cuando no se atiende a tiempo. |
| **Bitácora** | Registro histórico e inmodificable de las acciones del sistema. |

---

*Fin del manual. Para dudas sobre el uso del sistema, contacta al Departamento de
Gestión de Calidad.*

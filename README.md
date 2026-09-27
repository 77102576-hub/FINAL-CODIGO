# Solar Grid 9-Bus — Vercel / Next.js

Dashboard web para un prototipo académico de microrred fotovoltaica de 12 V DC, con topología visual de 9 barras, flujo ilustrativo, tendencias, alarmas simuladas, botones de contingencia, control ON/OFF, modo automático/manual y temperatura del transformador virtual.

## 1. Desplegar en Vercel

1. Descomprime este proyecto.
2. Sube la carpeta a un repositorio de GitHub.
3. En Vercel, selecciona **Add New → Project**, importa el repositorio y usa los valores predeterminados de Next.js.
4. Pulsa Deploy.

También puedes ejecutar localmente:

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## 2. Modo demostración

La aplicación funciona sin hardware y genera datos simulados en el navegador. Las fallas del panel son eventos virtuales para validar la interfaz; NO inyectan fallas eléctricas en la PCB.

La frecuencia de 60 Hz se muestra como una variable AC de referencia simulada. Una red DC real no tiene frecuencia eléctrica; si no existe una etapa inversora AC, etiqueta esta lectura como “frecuencia virtual”.

## 3. Integración con ESP32

En la ventana “Conectar ESP32”, introduce la IP de la placa. El frontend espera:

- `GET http://ESP32/api/status` → JSON de telemetría.
- `POST http://ESP32/api/command` → JSON `{ "command": "..." }`.

La implementación actual comprueba conectividad y envía comandos básicos, pero el dashboard aún usa sus valores de simulación para las gráficas. Para integrar datos reales, debes reemplazar el bloque de simulación en `app/page.jsx` por la lectura periódica de `/api/status` y mapear los campos reales.

Ejemplo de respuesta de estado:

```json
{
  "bus_voltage": 12.15,
  "bus_current": 4.8,
  "solar_percent": 82,
  "transformer_temp": 38.4,
  "battery_soc": 78,
  "frequency_virtual": 60.0,
  "buses": [
    {"id":1,"voltage":12.4,"current":3.1,"state":"on"}
  ]
}
```

Ejemplo de comandos: `system_on`, `system_off`, `auto_mode`, `manual_mode`, `reset_alarm`, `load1_on`, `load1_off`. Debes implementar la validación y ejecución real de estos comandos en el firmware ESP32.

### CORS y red
El ESP32 debe habilitar CORS para el origen donde se aloje el frontend. Un sitio HTTPS en Vercel no puede comunicarse de forma fiable con un dispositivo HTTP local en todos los navegadores/redes (mixed content y políticas del navegador). Para uso real, usa un backend/gateway seguro (por ejemplo, MQTT sobre TLS con autenticación, o un servicio HTTPS que reciba telemetría del ESP32). No expongas el ESP32 directamente a Internet.

## 4. Seguridad de hardware

- No uses la web HMI como protección primaria. Las protecciones físicas y el firmware local deben actuar incluso si la PC, Wi-Fi o Vercel dejan de funcionar.
- Incluye fusible DC por ramal, protección de polaridad, límites de corriente, desconexión segura y BMS compatible con la batería.
- MOSFET, relés y pistas de PCB deben dimensionarse para corriente DC, corriente de falla, disipación y temperatura.
- La función “reset” del dashboard es demostrativa; no debe cerrar contactores ni reponer cargas reales sin verificaciones locales, interbloqueos y autorización.
- El transformador no opera con DC constante. Para un transformador físico se requiere inversor/etapa AC adecuada; en esta demo T1 es una representación virtual.

## 5. Archivos

- `app/page.jsx`: interfaz y lógica de demostración.
- `app/globals.css`: estilos responsivos.
- `app/layout.jsx`: layout y metadatos.
- `package.json`: dependencias.

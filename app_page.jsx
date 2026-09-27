"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, BatteryCharging, Bell, CheckCircle2, CirclePower,
  Cpu, Gauge, Sun, Thermometer, Zap, Play, Pause, RotateCcw, Power,
  ShieldCheck, Radio, Wifi, RefreshCw, ArrowDown, PlugZap
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";
import "./globals.css";

const initialBuses = [
  { id: 1, name: "Bus 1 · Solar", v: 12.4, p: 42, state: "En servicio" },
  { id: 2, name: "Bus 2 · DC link", v: 12.2, p: 38, state: "En servicio" },
  { id: 3, name: "Bus 3 · Carga crítica", v: 12.1, p: 18, state: "En servicio" },
  { id: 4, name: "Bus 4 · Distribución", v: 12.0, p: 25, state: "En servicio" },
  { id: 5, name: "Bus 5 · Ramal T1", v: 11.9, p: 14, state: "En servicio" },
  { id: 6, name: "Bus 6 · Carga flexible", v: 12.0, p: 11, state: "En servicio" },
  { id: 7, name: "Bus 7 · Respaldo", v: 12.3, p: 9, state: "En servicio" },
  { id: 8, name: "Bus 8 · Conversión", v: 12.1, p: 12, state: "En servicio" },
  { id: 9, name: "Bus 9 · Salida", v: 12.0, p: 8, state: "En servicio" },
];

const faultOptions = [
  { id: "overvoltage", label: "Sobretensión", bus: 4 },
  { id: "overload", label: "Sobrecarga", bus: 6 },
  { id: "undervoltage", label: "Subtensión", bus: 3 },
  { id: "transformer", label: "Sobretemperatura T1", bus: 5 },
  { id: "short", label: "Sobrecorriente / falla de ramal", bus: 8 },
  { id: "frequency", label: "Oscilación de frecuencia (simulada)", bus: 1 },
];

function Metric({ icon: Icon, label, value, unit, tone = "blue", sub }) {
  return <div className="metric">
    <div className={`metric-icon ${tone}`}><Icon size={18}/></div>
    <div className="metric-copy"><span>{label}</span><strong>{value}<small>{unit}</small></strong>{sub && <em>{sub}</em>}</div>
  </div>;
}

function StatusPill({ children, danger = false }) {
  return <span className={`pill ${danger ? "pill-danger" : "pill-ok"}`}><i/>{children}</span>;
}

export default function Home() {
  const [systemOn, setSystemOn] = useState(true);
  const [auto, setAuto] = useState(true);
  const [running, setRunning] = useState(true);
  const [fault, setFault] = useState(null);
  const [alarmAck, setAlarmAck] = useState(false);
  const [solar, setSolar] = useState(82);
  const [loadLevel, setLoadLevel] = useState(62);
  const [temp, setTemp] = useState(38.4);
  const [frequency, setFrequency] = useState(60.0);
  const [voltage, setVoltage] = useState(12.15);
  const [current, setCurrent] = useState(4.8);
  const [selectedBus, setSelectedBus] = useState(1);
  const [history, setHistory] = useState([]);
  const [events, setEvents] = useState([{ time: new Date().toLocaleTimeString(), text: "Sistema iniciado en modo demostración", type: "ok" }]);
  const [espConnected, setEspConnected] = useState(false);
  const [espUrl, setEspUrl] = useState("http://192.168.4.1");
  const [showConnect, setShowConnect] = useState(false);

  const activeFault = fault && fault !== "cleared";
  const busData = useMemo(() => initialBuses.map(b => {
    let v = voltage + (b.id % 3 - 1) * 0.08;
    let state = systemOn ? "En servicio" : "Desenergizado";
    if (activeFault && faultOptions.find(f => f.id === fault)?.bus === b.id) {
      state = "Falla detectada";
      if (fault === "overvoltage") v = 14.1;
      if (fault === "undervoltage") v = 8.9;
    }
    if (!systemOn) v = 0;
    return { ...b, v: Number(v.toFixed(2)), state };
  }), [voltage, systemOn, fault, activeFault]);

  useEffect(() => {
    if (!running || !systemOn) return;
    const timer = setInterval(() => {
      const t = new Date();
      setVoltage(v => {
        if (fault === "overvoltage") return 14.1 + Math.random() * 0.25;
        if (fault === "undervoltage") return 8.7 + Math.random() * 0.3;
        return Math.max(11.7, Math.min(12.6, v + (Math.random() - .5) * .16));
      });
      setCurrent(c => fault === "overload" || fault === "short"
        ? 8.8 + Math.random() * 1.8
        : Math.max(1.1, Math.min(7.4, c + (Math.random() - .5) * .45)));
      setTemp(x => fault === "transformer"
        ? Math.min(92, x + .4 + Math.random() * .5)
        : Math.max(32, Math.min(48, x + (Math.random() - .5) * .5)));
      setFrequency(f => fault === "frequency"
        ? 59.1 + Math.random() * 1.8
        : Math.max(59.85, Math.min(60.15, f + (Math.random() - .5) * .08)));
      setHistory(old => [...old.slice(-29), {
        time: t.toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }),
        voltage: Number((fault === "overvoltage" ? 14.1 : fault === "undervoltage" ? 8.9 : voltage + (Math.random() - .5) * .2).toFixed(2)),
        frequency: Number((fault === "frequency" ? 59.1 + Math.random() * 1.8 : frequency + (Math.random() - .5) * .08).toFixed(2)),
        current: Number((fault === "overload" || fault === "short" ? 9 + Math.random() : current).toFixed(2)),
        temp: Number((fault === "transformer" ? temp + 1 : temp).toFixed(1)),
      }]);
    }, 1400);
    return () => clearInterval(timer);
  }, [running, systemOn, fault, voltage, frequency, current, temp]);

  useEffect(() => {
    if (activeFault && auto && systemOn) {
      const label = faultOptions.find(f => f.id === fault)?.label || "Falla";
      setEvents(old => [{ time: new Date().toLocaleTimeString(), text: `Protección lógica: ${label}; ramal aislado en modo demostración`, type: "danger" }, ...old].slice(0, 8));
    }
    // Deliberately no physical switching: demo logic only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fault]);

  const addEvent = (text, type = "ok") =>
    setEvents(old => [{ time: new Date().toLocaleTimeString(), text, type }, ...old].slice(0, 8));

  const triggerFault = id => {
    setFault(id);
    setAlarmAck(false);
    addEvent(`Falla simulada activada: ${faultOptions.find(f => f.id === id)?.label}`, "danger");
  };

  const resolveFault = () => {
    setFault(null);
    setAlarmAck(false);
    setTemp(38.4);
    setVoltage(12.15);
    setCurrent(4.8);
    setFrequency(60);
    addEvent("Reset de demostración: parámetros normalizados; verificar físicamente antes de reponer.", "ok");
  };

  const toggleSystem = () => {
    const next = !systemOn;
    setSystemOn(next);
    addEvent(next ? "Sistema DC habilitado (simulación)" : "Sistema DC apagado (simulación)", next ? "ok" : "warn");
  };

  const clearEvents = () => setEvents([]);

  async function connectEsp() {
    try {
      const url = espUrl.replace(/\/$/, "");
      const res = await fetch(`${url}/api/status`, { cache: "no-store" });
      if (!res.ok) throw new Error("No responde /api/status");
      const data = await res.json();
      setEspConnected(true);
      addEvent(`ESP32 conectado: ${JSON.stringify(data).slice(0, 100)}`, "ok");
    } catch {
      setEspConnected(false);
      addEvent("No se pudo conectar al ESP32. Se mantiene la simulación local.", "warn");
    }
    setShowConnect(false);
  }

  async function sendEspCommand(command) {
    if (!espConnected) {
      addEvent(`Orden ${command} simulada; ESP32 no conectado.`, "warn");
      return;
    }
    try {
      const res = await fetch(`${espUrl.replace(/\/$/, "")}/api/command`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command })
      });
      if (!res.ok) throw new Error();
      addEvent(`Orden enviada al ESP32: ${command}`, "ok");
    } catch {
      addEvent(`Error enviando ${command} al ESP32`, "danger");
    }
  }

  const faultLabel = faultOptions.find(f => f.id === fault)?.label;
  const flow = systemOn && running;

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark"><Sun size={23}/></div>
        <div><h1>SOLAR GRID <span>9-BUS</span></h1><p>Supervisión y automatización de microrred DC</p></div>
      </div>
      <div className="top-actions">
        <span className={`live-tag ${flow ? "live" : ""}`}><i/>{flow ? "MONITOREO ACTIVO" : "SISTEMA EN PAUSA"}</span>
        <button className="btn btn-outline" onClick={() => setShowConnect(true)}><Wifi size={16}/>{espConnected ? "ESP32 conectado" : "Conectar ESP32"}</button>
      </div>
    </header>

    <section className="hero-row">
      <div><div className="eyebrow">CENTRO DE CONTROL · PROTOTIPO FOTOVOLTAICO</div><h2>Panel de operación <span>en tiempo real</span></h2><p>Modelo visual de 9 barras con telemetría simulada o integración HTTP con ESP32.</p></div>
      <div className="main-controls">
        <button className={`btn ${systemOn ? "btn-danger" : "btn-green"}`} onClick={toggleSystem}><Power size={17}/>{systemOn ? "APAGAR SISTEMA" : "ENCENDER SISTEMA"}</button>
        <button className="btn btn-outline" onClick={() => setRunning(x => !x)}>{running ? <Pause size={17}/> : <Play size={17}/>} {running ? "Pausar flujo" : "Iniciar flujo"}</button>
        <button className={`btn ${auto ? "btn-green" : "btn-outline"}`} onClick={() => {setAuto(!auto); addEvent(`Modo ${!auto ? "automático" : "manual"} seleccionado`);}}><Cpu size={17}/>{auto ? "AUTO" : "MANUAL"}</button>
      </div>
    </section>

    {activeFault && <div className={`fault-banner ${!alarmAck ? "blink" : ""}`}>
      <div className="fault-symbol"><AlertTriangle size={22}/></div>
      <div><strong>ALARMA ACTIVA · {faultLabel}</strong><p>Se detectó una condición anormal en la simulación. Revise el ramal indicado y aplique el procedimiento seguro.</p></div>
      <button className="btn btn-dark" onClick={() => {setAlarmAck(true); addEvent("Alarma reconocida por operador", "warn");}}><Bell size={16}/> Reconocer</button>
    </div>}

    <section className="metrics-grid">
      <Metric icon={Zap} label="Tensión del bus DC" value={systemOn ? voltage.toFixed(2) : "0.00"} unit=" V" tone="blue" sub="Nominal de referencia: 12 V"/>
      <Metric icon={Activity} label="Corriente total" value={systemOn ? current.toFixed(2) : "0.00"} unit=" A" tone="purple" sub="Sensor de corriente / shunt"/>
      <Metric icon={Sun} label="Generación solar" value={systemOn ? solar : 0} unit=" %" tone="green" sub="Disponibilidad fotovoltaica simulada"/>
      <Metric icon={Thermometer} label="Temperatura T1" value={temp.toFixed(1)} unit=" °C" tone={temp > 65 ? "red" : "orange"} sub="Sensor de temperatura del módulo"/>
      <Metric icon={Gauge} label="Frecuencia de referencia" value={frequency.toFixed(2)} unit=" Hz" tone="cyan" sub="Variable virtual; DC no tiene frecuencia"/>
      <Metric icon={BatteryCharging} label="Carga batería" value="78" unit=" %" tone="green" sub="SOC demostrativo"/>
    </section>

    <section className="main-grid">
      <div className="panel topology-panel">
        <div className="panel-head"><div><span className="section-kicker">01 / TOPOLOGÍA</span><h3>Diagrama unifilar · 9 barras</h3></div><StatusPill danger={!!activeFault}>{activeFault ? "Falla activa" : systemOn ? "Red energizada" : "Sin tensión"}</StatusPill></div>
        <div className="topology-legend"><span><i className="dot green"/> Energizado</span><span><i className="dot red"/> Falla / disparo</span><span><i className="dot gray"/> Desconectado</span><span className="flow-key"><i/> Flujo DC ilustrativo</span></div>
        <div className="network">
          <div className="source solar-source"><Sun/><b>PV-01</b><small>Panel solar</small><strong>{solar}%</strong></div>
          <div className={`wire w-source ${flow ? "flowing" : ""}`}/>
          <div className={`bus-node bus1 ${selectedBus===1 ? "selected" : ""} ${activeFault && faultOptions.find(f=>f.id===fault)?.bus===1 ? "failed" : ""}`} onClick={() => setSelectedBus(1)}><b>BUS 1</b><small>{busData[0].v} V</small><em>42 W</em></div>
          <div className={`wire w12 ${flow ? "flowing" : ""}`}/>
          <div className={`bus-node bus2 ${selectedBus===2 ? "selected" : ""}`} onClick={() => setSelectedBus(2)}><b>BUS 2</b><small>{busData[1].v} V</small><em>38 W</em></div>
          <div className={`wire w23 ${flow ? "flowing" : ""}`}/>
          <div className={`bus-node bus3 ${selectedBus===3 ? "selected" : ""} ${activeFault && faultOptions.find(f=>f.id===fault)?.bus===3 ? "failed" : ""}`} onClick={() => setSelectedBus(3)}><b>BUS 3</b><small>{busData[2].v} V</small><em>18 W</em></div>
          <div className={`wire w34 ${flow ? "flowing" : ""}`}/>
          <div className={`bus-node bus4 ${selectedBus===4 ? "selected" : ""} ${activeFault && faultOptions.find(f=>f.id===fault)?.bus===4 ? "failed" : ""}`} onClick={() => setSelectedBus(4)}><b>BUS 4</b><small>{busData[3].v} V</small><em>25 W</em></div>
          <div className={`wire w45 ${flow ? "flowing" : ""}`}/>
          <div className={`bus-node bus5 ${selectedBus===5 ? "selected" : ""} ${activeFault && faultOptions.find(f=>f.id===fault)?.bus===5 ? "failed" : ""}`} onClick={() => setSelectedBus(5)}><b>BUS 5</b><small>{busData[4].v} V</small><em>14 W</em></div>
          <div className={`wire w56 ${flow ? "flowing" : ""}`}/>
          <div className={`bus-node bus6 ${selectedBus===6 ? "selected" : ""} ${activeFault && faultOptions.find(f=>f.id===fault)?.bus===6 ? "failed" : ""}`} onClick={() => setSelectedBus(6)}><b>BUS 6</b><small>{busData[5].v} V</small><em>11 W</em></div>
          <div className={`wire w67 ${flow ? "flowing" : ""}`}/>
          <div className={`bus-node bus7 ${selectedBus===7 ? "selected" : ""}`} onClick={() => setSelectedBus(7)}><b>BUS 7</b><small>{busData[6].v} V</small><em>9 W</em></div>
          <div className={`wire w78 ${flow ? "flowing" : ""}`}/>
          <div className={`bus-node bus8 ${selectedBus===8 ? "selected" : ""} ${activeFault && faultOptions.find(f=>f.id===fault)?.bus===8 ? "failed" : ""}`} onClick={() => setSelectedBus(8)}><b>BUS 8</b><small>{busData[7].v} V</small><em>12 W</em></div>
          <div className={`wire w89 ${flow ? "flowing" : ""}`}/>
          <div className={`bus-node bus9 ${selectedBus===9 ? "selected" : ""}`} onClick={() => setSelectedBus(9)}><b>BUS 9</b><small>{busData[8].v} V</small><em>8 W</em></div>
          <div className="branch branch-battery"><span className="branch-wire"/><div className="mini-device"><BatteryCharging/><b>BAT-01</b><small>12 V · 78%</small></div></div>
          <div className="branch branch-transformer"><span className="branch-wire"/><div className={`mini-device ${activeFault && fault === "transformer" ? "device-fail" : ""}`}><PlugZap/><b>T1 virtual</b><small>{temp.toFixed(1)} °C</small></div></div>
          <div className="branch branch-load"><span className="branch-wire"/><div className="mini-device"><Activity/><b>LOAD-01</b><small>{loadLevel}% demanda</small></div></div>
          <div className="branch branch-inverter"><span className="branch-wire"/><div className="mini-device"><Zap/><b>INV-01</b><small>DC-AC demo</small></div></div>
          <div className="topology-foot"><span><b>Barra seleccionada:</b> BUS {selectedBus}</span><span><b>Estado:</b> {busData[selectedBus-1]?.state}</span><span><b>Flujo:</b> {flow ? "Activo (ilustrativo)" : "Detenido"}</span></div>
        </div>
      </div>

      <div className="right-stack">
        <div className="panel">
          <div className="panel-head"><div><span className="section-kicker">02 / TENDENCIAS</span><h3>Parámetros eléctricos</h3></div><span className="live-mini"><i/> LIVE</span></div>
          <div className="chart-title"><span>Tensión del bus</span><strong>{voltage.toFixed(2)} V</strong></div>
          <div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={history}><defs><linearGradient id="vfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2f9cf4" stopOpacity={.3}/><stop offset="95%" stopColor="#2f9cf4" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#26364b"/><XAxis dataKey="time" tick={{fill:"#91a3b9",fontSize:10}}/><YAxis domain={[0,16]} tick={{fill:"#91a3b9",fontSize:10}} width={30}/><Tooltip contentStyle={{background:"#101d2d",border:"1px solid #2a3c52",borderRadius:8}}/><ReferenceLine y={12} stroke="#5fce9b" strokeDasharray="5 5"/><Area type="monotone" dataKey="voltage" stroke="#36a5ff" fill="url(#vfill)" strokeWidth={2} name="V DC"/></AreaChart></ResponsiveContainer></div>
          <div className="chart-title chart-title-second"><span>Frecuencia de referencia <small>(variable virtual AC)</small></span><strong>{frequency.toFixed(2)} Hz</strong></div>
          <div className="chart chart-small"><ResponsiveContainer width="100%" height="100%"><LineChart data={history}><CartesianGrid strokeDasharray="3 3" stroke="#26364b"/><XAxis dataKey="time" tick={{fill:"#91a3b9",fontSize:10}}/><YAxis domain={[58,62]} tick={{fill:"#91a3b9",fontSize:10}} width={30}/><Tooltip contentStyle={{background:"#101d2d",border:"1px solid #2a3c52",borderRadius:8}}/><ReferenceLine y={60} stroke="#5fce9b" strokeDasharray="5 5"/><Line type="monotone" dataKey="frequency" stroke="#b18aff" dot={false} strokeWidth={2} name="Hz"/></LineChart></ResponsiveContainer></div>
          <p className="note">La frecuencia se muestra como señal virtual para la HMI; un bus DC real no posee frecuencia eléctrica de 60 Hz.</p>
        </div>

        <div className="panel">
          <div className="panel-head"><div><span className="section-kicker">03 / TRANSFORMADOR</span><h3>Supervisión térmica T1</h3></div><Thermometer className="muted-icon"/></div>
          <div className="temp-row"><div className="temp-number">{temp.toFixed(1)}<small>°C</small></div><div className="temp-status"><span className={`temp-dot ${temp>65?"hot":""}`}/><b>{temp > 65 ? "Temperatura alta" : "Temperatura normal"}</b><small>Umbral demo: 65 °C</small></div></div>
          <div className="temp-track"><span style={{width:`${Math.min(100,temp/90*100)}%`,background:temp>65?"#ff5263":"linear-gradient(90deg,#2fa7ff,#55d6a3)"}}/></div>
          <div className="temp-labels"><span>0 °C</span><span>65 °C alarma</span><span>90 °C</span></div>
          <div className="control-row"><button className="btn btn-outline btn-small" onClick={() => {setTemp(72);triggerFault("transformer");}}>Simular sobretemperatura</button><button className="btn btn-outline btn-small" onClick={() => {setTemp(38.4); if(fault==="transformer")resolveFault();}}>Restablecer</button></div>
        </div>
      </div>
    </section>

    <section className="bottom-grid">
      <div className="panel">
        <div className="panel-head"><div><span className="section-kicker">04 / PROTECCIÓN</span><h3>Inyectar contingencia de prueba</h3></div><ShieldCheck className="muted-icon"/></div>
        <p className="panel-desc">Activa eventos simulados para validar alarmas, visualización y secuencia lógica. No aplica fallas eléctricas físicas.</p>
        <div className="fault-buttons">{faultOptions.map(f => <button key={f.id} className={`fault-button ${fault===f.id?"fault-selected":""}`} onClick={() => triggerFault(f.id)}><AlertTriangle size={16}/><span>{f.label}</span><small>BUS {f.bus}</small></button>)}</div>
        <div className="control-row control-row-wrap">
          <button className="btn btn-danger" onClick={resolveFault}><RotateCcw size={16}/> Reset / normalizar</button>
          <button className="btn btn-outline" onClick={() => {setLoadLevel(x=>x>=100?35:x+15);addEvent("Demanda de carga modificada desde HMI","warn");}}>Cambiar demanda de carga</button>
          <button className="btn btn-outline" onClick={() => {setSolar(x=>x>=100?25:x+15);addEvent("Disponibilidad solar modificada desde HMI","ok");}}>Ajustar generación solar</button>
        </div>
        <div className="range-row"><label>Generación solar <b>{solar}%</b></label><input type="range" min="0" max="100" value={solar} onChange={e=>setSolar(Number(e.target.value))}/></div>
        <div className="range-row"><label>Demanda de carga <b>{loadLevel}%</b></label><input type="range" min="0" max="100" value={loadLevel} onChange={e=>setLoadLevel(Number(e.target.value))}/></div>
      </div>

      <div className="panel">
        <div className="panel-head"><div><span className="section-kicker">05 / EVENTOS</span><h3>Registro de alarmas y maniobras</h3></div><button className="text-button" onClick={clearEvents}>Limpiar</button></div>
        <div className="events-list">{events.length===0?<div className="empty">Sin eventos registrados.</div>:events.map((e,i)=><div className="event" key={i}><div className={`event-icon ${e.type}`}><i/></div><div className="event-copy"><p>{e.text}</p><small>{e.time}</small></div></div>)}</div>
        <div className="event-footer"><span><i className="dot green"/> Registro local de demostración</span><span>{events.length} eventos</span></div>
      </div>
    </section>

    <section className="panel bus-table-panel">
      <div className="panel-head"><div><span className="section-kicker">06 / TELEMETRÍA</span><h3>Estado de las nueve barras</h3></div><span className="muted-caption">Selecciona una barra en el unifilar para resaltarla</span></div>
      <div className="table-wrap"><table><thead><tr><th>Barra</th><th>Tensión</th><th>Potencia demo</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{busData.map(b=><tr key={b.id} className={selectedBus===b.id?"row-selected":""}><td><b>{b.name}</b></td><td>{b.v.toFixed(2)} V</td><td>{b.p} W</td><td><span className={`table-state ${b.state==="Falla detectada"?"bad":!systemOn?"off":"good"}`}>{b.state}</span></td><td><button className="table-action" onClick={()=>{setSelectedBus(b.id);addEvent(`BUS ${b.id} seleccionado para supervisión`,"ok");}}>Supervisar</button></td></tr>)}</tbody></table></div>
    </section>

    <footer><div className="footer-brand"><Sun size={17}/> SOLAR GRID 9-BUS</div><span>Prototipo académico · Simulación HMI · 12 V DC</span><span className="safety"><AlertTriangle size={13}/> No usar para maniobrar equipos reales sin protecciones y validación profesional.</span></footer>

    {showConnect && <div className="modal-backdrop" onClick={()=>setShowConnect(false)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="panel-head"><h3>Conectar con ESP32</h3><button className="icon-button" onClick={()=>setShowConnect(false)}>×</button></div><p>Introduce la URL o IP del ESP32. La placa debe exponer los endpoints HTTP descritos en el archivo README.</p><label className="field-label">URL del ESP32</label><input className="text-input" value={espUrl} onChange={e=>setEspUrl(e.target.value)} placeholder="http://192.168.4.1"/><div className="control-row"><button className="btn btn-green" onClick={connectEsp}><Wifi size={16}/> Probar conexión</button><button className="btn btn-outline" onClick={()=>setShowConnect(false)}>Cancelar</button></div><small className="modal-note">La app funciona en modo simulación si no hay conexión. Para uso real configura CORS, autenticación y una red local segura.</small></div></div>}
  </main>;
}

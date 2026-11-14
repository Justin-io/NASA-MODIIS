import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { IncidentRecord } from '../shared/types';
import { apiClient } from '../shared/apiClient';
import { ALEX_LIVE_TOOLS, ALEX_SKILL_GUIDES } from './voiceAgentTools';
import { MonitoredRegion } from '../shared/dataAdapter';

interface VoiceAssistantAndPaletteProps {
  incidents: IncidentRecord[];
  selectedIncidentId: string;
  selectedRegion: MonitoredRegion;
  onSelectIncident: (id: string) => void;
  onNavigateTab: (tab: string) => void;
  isPaletteOpen: boolean;
  onClosePalette: () => void;
  isVoiceOpen: boolean;
  onToggleVoiceOpen: (open: boolean) => void;
}

interface VoiceMessage {
  role: 'operator' | 'alex';
  text: string;
  timestamp: string;
}

function getWorkspaceScroller(): HTMLElement {
  const candidates = [document.scrollingElement, ...Array.from(document.querySelectorAll<HTMLElement>('main, [class*="overflow-y-auto"], [class*="overflow-auto"]'))]
    .filter((node): node is HTMLElement => node instanceof HTMLElement && node.scrollHeight > node.clientHeight + 8);
  return candidates.sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0] || document.documentElement;
}

const VOICE_PRESET_PROMPTS = [
  'What is the fire status and FRP in Sigur Plateau right now?',
  'Check fuel moisture and burning index at Nilgiri coordinates.',
  'What evacuation corridors and railway lines are open?',
  'Prepare an emergency alert draft for incident commanders.',
  'Query aerial firefighting tankers and helicopters in region.',
];

const AVAILABLE_VOICES = [
  { id: 'Aoede', label: 'Aoede (Crisp Command)' },
  { id: 'Puck', label: 'Puck (Authoritative Direct)' },
  { id: 'Charon', label: 'Charon (Deep Tactical)' },
  { id: 'Fenrir', label: 'Fenrir (Male, Field Radio)' },
  { id: 'Kore', label: 'Kore (Clear Dispatcher)' },
] as const;

export const VoiceAssistantAndPalette: React.FC<VoiceAssistantAndPaletteProps> = ({
  incidents,
  selectedIncidentId,
  selectedRegion,
  onSelectIncident,
  onNavigateTab,
  isPaletteOpen,
  onClosePalette,
  isVoiceOpen,
  onToggleVoiceOpen,
}) => {
  const [micListening, setMicListening] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<'Aoede' | 'Puck' | 'Charon' | 'Fenrir' | 'Kore'>('Fenrir');
  const [voiceInput, setVoiceInput] = useState('');
  const [voiceHistory, setVoiceHistory] = useState<VoiceMessage[]>([
    {
      role: 'alex',
      text: 'ALEX voice is ready. Start a Live session to stream speech and receive spoken responses. External calls and alerts require an authorized operator action.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [paletteQuery, setPaletteQuery] = useState('');

  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const handsFreeRef = useRef(false);
  const liveSessionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const inputProcessorRef = useRef<AudioWorkletNode | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const outputTimeRef = useRef(0);
  const inputTranscriptRef = useRef('');
  const outputTranscriptRef = useRef('');
  const liveStartIdRef = useRef(0);
  const disconnectAfterReplyRef = useRef(false);

  useEffect(() => { handsFreeRef.current = handsFree; }, [handsFree]);

  const activeIncident =
    incidents.find((i) => i.id === selectedIncidentId) || incidents[0];

  // Scroll transcript to bottom on new message
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [voiceHistory]);

  // Close microphone/audio resources when the panel is dismissed.
  useEffect(() => {
    return () => {
      liveStartIdRef.current += 1;
      liveSessionRef.current?.close();
      inputProcessorRef.current?.disconnect();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      void inputContextRef.current?.close();
      void outputContextRef.current?.close();
    };
  }, []);

  const floatToPcm16Base64 = (samples: Float32Array, sourceRate: number, targetRate = 16000) => {
    const ratio = sourceRate / targetRate;
    const outLength = Math.floor(samples.length / ratio);
    const bytes = new Uint8Array(outLength * 2);
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < outLength; i++) {
      const start = Math.floor(i * ratio), end = Math.min(samples.length, Math.floor((i + 1) * ratio));
      let sum = 0;
      for (let j = start; j < end; j++) sum += samples[j];
      const sample = Math.max(-1, Math.min(1, sum / Math.max(1, end - start)));
      view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
    return btoa(binary);
  };

  const stopLiveSession = () => {
    liveStartIdRef.current += 1;
    handsFreeRef.current = false; setHandsFree(false); setMicListening(false);
    inputProcessorRef.current?.disconnect(); inputProcessorRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop()); mediaStreamRef.current = null;
    liveSessionRef.current?.close(); liveSessionRef.current = null;
    outputSourcesRef.current.forEach((source) => { try { source.stop(); } catch {} }); outputSourcesRef.current.clear();
    void inputContextRef.current?.close(); inputContextRef.current = null;
    void outputContextRef.current?.close(); outputContextRef.current = null;
    setLiveStatus('disconnected'); setIsPlayingAudio(false);
  };

  const startLiveSession = async () => {
    const startId = ++liveStartIdRef.current;
    disconnectAfterReplyRef.current = false;
    setVoiceError(null); setLiveStatus('connecting');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access requires HTTPS or localhost and a supported browser.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (startId !== liveStartIdRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      mediaStreamRef.current = stream;
      const tokenPayload = await apiClient.createLiveVoiceToken(selectedVoice);
      if (startId !== liveStartIdRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      const ai = new GoogleGenAI({ apiKey: tokenPayload.token, httpOptions: { apiVersion: 'v1alpha' } });
      const outputContext = new AudioContext();
      outputContextRef.current = outputContext;
      await outputContext.resume();
      const session = await ai.live.connect({
        model: tokenPayload.model,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } },
          inputAudioTranscription: {}, outputAudioTranscription: {}, sessionResumption: {},
          tools: ALEX_LIVE_TOOLS,
        },
        callbacks: {
          onopen: () => {
            if (startId !== liveStartIdRef.current) return;
            setLiveStatus('connected'); setHandsFree(true); handsFreeRef.current = true;
          },
          onmessage: (message: any) => {
            if (message.toolCall?.functionCalls?.length) {
              void Promise.all(message.toolCall.functionCalls.map(async (call: any) => ({
                id: call.id,
                name: call.name,
                response: await executeLiveTool(call.name, call.args || {}),
              }))).then((functionResponses) => liveSessionRef.current?.sendToolResponse({ functionResponses }))
                .catch((error) => setVoiceError(error?.message || 'ALEX could not complete a requested UI tool.'));
            }
            const content = message.serverContent;
            if (content?.inputTranscription?.text) {
              inputTranscriptRef.current += content.inputTranscription.text;
              setVoiceInput(inputTranscriptRef.current);
              if (/\b(thank you|thanks|that's all|that is all|goodbye|bye alex)\b/i.test(inputTranscriptRef.current)) disconnectAfterReplyRef.current = true;
            }
            if (content?.outputTranscription?.text) outputTranscriptRef.current += content.outputTranscription.text;
            if (content?.interrupted) {
              outputSourcesRef.current.forEach((source) => { try { source.stop(); } catch {} });
              outputSourcesRef.current.clear(); outputTimeRef.current = 0;
              setIsPlayingAudio(false);
            }
            for (const part of content?.modelTurn?.parts || []) {
              if (!part.inlineData?.data) continue;
              const binary = atob(part.inlineData.data);
              const samples = new Int16Array(binary.length / 2);
              for (let i = 0; i < samples.length; i++) samples[i] = (binary.charCodeAt(i * 2 + 1) << 8) | binary.charCodeAt(i * 2);
              const buffer = outputContext.createBuffer(1, samples.length, 24000);
              const channel = buffer.getChannelData(0);
              for (let i = 0; i < samples.length; i++) channel[i] = samples[i] / 32768;
              const source = outputContext.createBufferSource(); source.buffer = buffer; source.connect(outputContext.destination);
              const when = Math.max(outputContext.currentTime + 0.04, outputTimeRef.current);
              source.start(when); outputTimeRef.current = when + buffer.duration;
              setIsPlayingAudio(true);
              outputSourcesRef.current.add(source); source.onended = () => { outputSourcesRef.current.delete(source); if (!outputSourcesRef.current.size) setIsPlayingAudio(false); };
            }
            if (content?.turnComplete) {
              const inputText = inputTranscriptRef.current.trim();
              const outputText = outputTranscriptRef.current.trim();
              if (inputText) setVoiceHistory((prev) => [...prev, { role: 'operator', text: inputText, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
              if (outputText) setVoiceHistory((prev) => [...prev, { role: 'alex', text: outputText, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
              inputTranscriptRef.current = ''; outputTranscriptRef.current = ''; setVoiceInput('');
              if (disconnectAfterReplyRef.current) {
                disconnectAfterReplyRef.current = false;
                const waitMs = Math.max(1800, (outputTimeRef.current - outputContext.currentTime) * 1000 + 350);
                window.setTimeout(stopLiveSession, waitMs);
              }
            }
          },
          onerror: (event: any) => setVoiceError(event?.message || 'Gemini Live WebSocket encountered an error.'),
          onclose: (event: any) => { if (handsFreeRef.current) { setVoiceError(event?.reason || 'Gemini Live session disconnected.'); stopLiveSession(); } },
        },
      });
      if (startId !== liveStartIdRef.current) { session.close(); stream.getTracks().forEach((track) => track.stop()); return; }
      liveSessionRef.current = session;
      const inputContext = new AudioContext(); inputContextRef.current = inputContext; await inputContext.resume();
      const source = inputContext.createMediaStreamSource(stream);
      await inputContext.audioWorklet.addModule('/pcm-capture-worklet.js');
      const processor = new AudioWorkletNode(inputContext, 'pcm-capture', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
      inputProcessorRef.current = processor;
      processor.port.onmessage = (event: MessageEvent<Float32Array>) => {
        if (!handsFreeRef.current || !liveSessionRef.current) return;
        const data = floatToPcm16Base64(new Float32Array(event.data), inputContext.sampleRate);
        try { liveSessionRef.current.sendRealtimeInput({ audio: { data, mimeType: 'audio/pcm;rate=16000' } }); }
        catch (error: any) { setVoiceError(error.message || 'Could not stream microphone audio to Gemini Live.'); }
      };
      const mutedOutput = inputContext.createGain();
      mutedOutput.gain.value = 0;
      source.connect(processor); processor.connect(mutedOutput); mutedOutput.connect(inputContext.destination);
      setMicListening(true);
    } catch (error: any) {
      if (startId !== liveStartIdRef.current) return;
      stopLiveSession(); setVoiceError(error.message || 'Could not start the Gemini Live session.');
    }
  };

  const toggleHandsFree = () => {
    if (liveStatus === 'connected' || liveStatus === 'connecting') stopLiveSession();
    else void startLiveSession();
  };

  const handleSendVoiceQuery = (queryText: string) => {
    const text = queryText.trim();
    if (!text) return;
    if (!liveSessionRef.current || liveStatus !== 'connected') {
      setVoiceError('Start a Gemini Live session before sending text or voice commands.');
      return;
    }
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setVoiceHistory((prev) => [...prev, { role: 'operator', text, timestamp }]);
    setVoiceInput('');
    inputTranscriptRef.current = '';
    outputTranscriptRef.current = '';
    try {
      liveSessionRef.current.sendRealtimeInput({ text });
    } catch (error: any) {
      setVoiceError(error?.message || 'Could not send text through the Live session.');
    }
  };

  const executeLiveTool = async (name: string, args: Record<string, any>) => {
    switch (name) {
      case 'activate_alex_skill': {
        const skill = String(args.skill || '');
        return ALEX_SKILL_GUIDES[skill] ? { ok: true, skill, guide: ALEX_SKILL_GUIDES[skill] } : { ok: false, error: 'Unknown ALEX skill.' };
      }
      case 'navigate_workspace': onNavigateTab(String(args.view)); return { ok: true, view: args.view };
      case 'show_earth_globe': {
        onNavigateTab('dashboard');
        window.setTimeout(() => window.dispatchEvent(new CustomEvent('alex:show-earth-globe')), 700);
        return { ok: true, requested: '3D Earth globe view', view: 'dashboard', detail: 'Switching dashboard to Research Globe mode.' };
      }
      case 'select_incident': {
        const incident = incidents.find((item) => item.id === args.incidentId);
        if (!incident) return { ok: false, error: 'Incident ID was not found.' };
        onSelectIncident(incident.id); return { ok: true, incidentId: incident.id };
      }
      case 'scroll_page': {
        const target = getWorkspaceScroller();
        const delta = (args.direction === 'up' ? -1 : 1) * Math.max(100, Math.min(1200, Number(args.amount) || 500));
        const before = target.scrollTop;
        target.scrollBy({ top: delta, behavior: 'smooth' });
        return { ok: true, direction: args.direction, from: before, requestedPixels: delta, maxScroll: target.scrollHeight - target.clientHeight };
      }
      case 'set_page_zoom': {
        const percent = Math.max(70, Math.min(150, Number(args.percent) || 100));
        document.documentElement.style.zoom = `${percent}%`; return { ok: true, zoomPercent: percent };
      }
      case 'click_visible_control': {
        const label = String(args.label || '').trim().toLowerCase();
        if (!label) return { ok: false, error: 'A visible control label is required.' };
        const controls = Array.from(document.querySelectorAll<HTMLElement>('button,a,[role="button"],[role="tab"]'));
        const target = controls.find((el) => {
          const text = (el.getAttribute('aria-label') || el.innerText || '').trim().toLowerCase();
          const rect = el.getBoundingClientRect();
          return text === label && rect.width > 0 && rect.height > 0 && !el.hasAttribute('disabled');
        });
        if (!target) return { ok: false, error: `No visible enabled control exactly matched “${args.label}”.` };
        target.click(); return { ok: true, clicked: args.label };
      }
      case 'read_visible_workspace': return { title: document.title, headings: Array.from(document.querySelectorAll('h1,h2,h3')).filter((el) => (el as HTMLElement).getBoundingClientRect().height > 0).slice(0, 20).map((el) => el.textContent?.trim()), visibleText: document.body.innerText.slice(0, 7000) };
      case 'read_operational_data': {
        const paths: Record<string, string> = { incidents:'/api/incidents', news:'/api/news', observations:'/api/observations', wildfires:'/api/eonet/wildfires', routes:'/api/routes/status', fleet:'/api/fleet/apparatus', aircraft:'/api/aircraft/responders', diagnostics:'/api/diagnostics', telephony_status:'/api/telephony/status', alerts_status:'/api/alerts/telegram/status', road_hazards:'/api/hazards/roads', bridge_restrictions:'/api/hazards/bridges', staging_sites:'/api/fleet/staging', exposed_population:'/api/exposure/summary', evacuation_zones:'/api/exposure/evacuation-zones', critical_infrastructure:'/api/exposure/infrastructure', ground_verification:'/api/corroboration/matrix', cad_status:'/api/cad/dispatches' };
        const dataset = String(args.dataset);
        const path = dataset === 'weather'
          ? `/api/weather?lat=${selectedRegion.center.lat}&lng=${selectedRegion.center.lng}&name=${encodeURIComponent(selectedRegion.name)}&stationId=${encodeURIComponent(`REGIONAL-${selectedRegion.id}`)}`
          : paths[dataset];
        if (!path) return { ok: false, error: 'Unknown read-only dataset.' };
        const response = await fetch(path); if (!response.ok) return { ok: false, error: `${args.dataset} API returned HTTP ${response.status}.` };
        return { ok: true, dataset: args.dataset, data: await response.json() };
      }
      case 'calculate_rescue_route': {
        const [providerResponse, routeResponse] = await Promise.all([
          fetch('/api/routes/status'),
          fetch('/api/routes/calculate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ origin: [args.originLat, args.originLng], destination: [args.destinationLat, args.destinationLng], originName: args.originName, destinationName: args.destinationName, vehicleCategory: args.vehicleCategory }) }),
        ]);
        const provider = await providerResponse.json();
        const route = await routeResponse.json();
        if (!routeResponse.ok) return { ok: false, provider, error: route.error || `Route API returned HTTP ${routeResponse.status}.` };
        return { ok: true, provider, route, advisory: 'Route geometry does not confirm road safety or emergency access. Review current road and bridge hazards.' };
      }
      default: return { ok: false, error: 'Tool is not available.' };
    }
  };

  const toggleMicListening = () => {
    if (liveStatus === 'connected' || liveStatus === 'connecting') stopLiveSession();
    else void startLiveSession();
  };

  useEffect(() => {
    if (!isVoiceOpen) stopLiveSession();
  }, [isVoiceOpen]);

  const paletteCommands = [
    { id: 'cmd-dash', label: 'Go to Operational Command Dashboard', action: () => onNavigateTab('dashboard') },
    { id: 'cmd-inc', label: 'Open Incident Intelligence & NASA Burning Activity Calendar', action: () => onNavigateTab('incidents') },
    { id: 'cmd-env', label: 'Inspect Environmental & Ridge Weather Telemetry', action: () => onNavigateTab('environment') },
    { id: 'cmd-news', label: 'Open Live News & Claim Verification Feed', action: () => onNavigateTab('news') },
    { id: 'cmd-ev', label: 'Inspect Interactive Evidence Graph & Adaptive Agents', action: () => onNavigateTab('evidence') },
    { id: 'cmd-rt', label: 'Open Smart Emergency Routing & Casualty Coordination', action: () => onNavigateTab('routing') },
    { id: 'cmd-sim', label: 'Launch Scenario Simulation & Digital Twin', action: () => onNavigateTab('simulation') },
    { id: 'cmd-rep', label: 'Export ICS-201 Situation Report & GeoJSON', action: () => onNavigateTab('reports') },
  ].filter((c) =>
    paletteQuery.trim() === '' ? true : c.label.toLowerCase().includes(paletteQuery.toLowerCase())
  );

  return (
    <>
      {/* Desktop Floating Voice Briefing Trigger */}
      <div className="fixed bottom-16 lg:bottom-5 right-3 sm:right-5 z-40">
        {isVoiceOpen ? (
        <div className="w-[calc(100vw-24px)] sm:w-[460px] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>ALEX Voice Conversation</span>
                    <span className={`px-1.5 py-0.2 text-[9px] font-mono rounded border ${liveStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : liveStatus === 'connecting' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>{liveStatus === 'connected' ? 'LIVE SOCKET' : liveStatus === 'connecting' ? 'CONNECTING' : 'DISCONNECTED'}</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                  {activeIncident ? `Incident: ${activeIncident.id}` : 'No active incident'} · Speak naturally; pause to send
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value as any)}
                  disabled={liveStatus !== 'disconnected'}
                  aria-label="Select AI Voice profile"
                  className="text-[10px] bg-slate-800 text-slate-200 border border-slate-700 rounded px-1.5 py-0.5 font-mono focus:outline-none"
                >
                  {AVAILABLE_VOICES.map((v) => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onToggleVoiceOpen(false)}
                  className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Waveform & Microphone Status Bar */}
            <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-1">
                {[14, 22, 10, 26, 18, 12, 24, 16, 20].map((h, idx) => (
                  <span
                    key={idx}
                    className={`w-1 rounded-full transition-all duration-150 ${
                      micListening
                        ? 'bg-rose-500 animate-pulse'
                        : isPlayingAudio
                        ? 'bg-emerald-400 animate-pulse'
                        : liveStatus === 'connecting'
                        ? 'bg-amber-400 animate-bounce'
                        : 'bg-slate-700'
                    }`}
                    style={{
                      height: micListening || isPlayingAudio ? `${h}px` : liveStatus === 'connecting' ? '10px' : '4px',
                    }}
                  />
                ))}
                <span className="text-[11px] font-mono text-slate-300 ml-2">
                  {micListening
                    ? 'Listening to microphone...'
                    : isPlayingAudio
                    ? 'Gemini 3.8 Speaking (24kHz)...'
                    : liveStatus === 'connecting'
                    ? 'Connecting to Gemini Live...'
                    : 'Voice standby'}
                </span>
              </div>
              <button
                type="button"
                onClick={toggleHandsFree}
                disabled={liveStatus === 'connecting'}
                aria-pressed={handsFree}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow ${handsFree ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'} disabled:opacity-50`}
              >
                <span>{handsFree ? '■ End hands-free' : '🎙 Start hands-free'}</span>
              </button>
            </div>

            {voiceError && <div role="status" className="px-4 py-2 text-xs bg-rose-950/70 text-rose-200 border-b border-rose-900">{voiceError}</div>}

            {/* Conversation Transcript */}
            <div className="p-3.5 flex-1 overflow-y-auto space-y-2.5 text-xs max-h-64 divide-y divide-slate-800/40">
              {voiceHistory.map((item, i) => (
                <div
                  key={i}
                  className={`pt-2 rounded-lg ${
                    item.role === 'operator' ? 'text-right' : 'text-left'
                  }`}
                >
                  <div
                    className={`inline-block p-2.5 rounded-xl max-w-[90%] text-left ${
                      item.role === 'operator'
                        ? 'bg-emerald-700/80 text-white border border-emerald-600/50'
                        : 'bg-slate-800/90 text-slate-100 border border-slate-700/70'
                    }`}
                  >
                    <div>{item.text}</div>

                    {/* Tools badges if any were executed */}
                    <div className="text-[9px] font-mono opacity-50 mt-1">
                      {item.role === 'operator' ? 'Incident Commander' : `ALEX Voice (${selectedVoice})`} · {item.timestamp}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>

            {/* Quick Contextual Prompts */}
            <div className="px-3 py-1.5 border-t border-slate-800 bg-slate-950/60 flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[10px] font-mono text-slate-400 shrink-0">Prompts:</span>
              {VOICE_PRESET_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendVoiceQuery(p)}
                  className="px-2 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded whitespace-nowrap shrink-0 border border-slate-700/60"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendVoiceQuery(voiceInput);
              }}
              className="p-2.5 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2"
            >
              <input
                type="text"
                value={voiceInput}
                onChange={(e) => setVoiceInput(e.target.value)}
                placeholder="Speak or type command for Gemini 3.8 Live..."
                aria-label="Ask ALEX voice assistant"
                disabled={liveStatus !== 'connected'}
                className="flex-1 px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={liveStatus !== 'connected' || !voiceInput.trim()}
                className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-all"
              >
                Send
              </button>
              {!handsFree && <button type="button" onClick={toggleMicListening} className="px-3 py-1.5 text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white rounded-lg">{micListening ? 'Stop & send' : 'Mic'}</button>}
            </form>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onToggleVoiceOpen(true)}
            className="flex px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold rounded-full shadow-lg items-center gap-2 border border-emerald-400/30 transition-all transform hover:scale-105"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span>🎙️ Gemini 3.8 Live Voice Command</span>
          </button>
        )}
      </div>

      {/* Contextual Command Palette (Ctrl/Cmd + K) */}
      {isPaletteOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-start justify-center pt-14 sm:pt-20 px-3 sm:px-4"
          onClick={onClosePalette}
        >
          <div
            className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="ALEX Command Palette"
          >
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between gap-2">
              <input
                type="search"
                autoFocus
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                placeholder="Search workspaces or incident ID (e.g. INC-2026-0842)..."
                aria-label="Command palette search"
                className="w-full text-xs text-white bg-transparent placeholder:text-slate-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={onClosePalette}
                className="px-2.5 py-1 text-[11px] font-mono bg-slate-800 rounded-lg text-slate-300 border border-slate-700"
              >
                ESC
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-800 p-2">
              {paletteCommands.map((cmd) => (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={() => {
                    cmd.action();
                    onClosePalette();
                  }}
                  className="w-full text-left px-3 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-800 rounded-lg transition-all"
                >
                  {cmd.label}
                </button>
              ))}
              {incidents.map((inc) => (
                <button
                  key={inc.id}
                  type="button"
                  onClick={() => {
                    onSelectIncident(inc.id);
                    onNavigateTab('incidents');
                    onClosePalette();
                  }}
                  className="w-full text-left px-3 py-2.5 text-xs text-slate-400 hover:bg-slate-800 rounded-lg flex items-center justify-between gap-2"
                >
                  <span className="truncate">Inspect {inc.title}</span>
                  <span className="font-mono text-[11px] text-emerald-400 shrink-0">
                    {inc.id}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

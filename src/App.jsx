import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Users, UserMinus, Play, Eye, EyeOff, 
  Settings, BookOpen, Info, Volume2, VolumeX,
  HelpCircle, ChevronRight, Gavel, X, Clock, ExternalLink,
  Crown, MicOff, Edit3, ScrollText, Sword, ChevronLeft, Music,
  Sparkles, Trophy, AlertTriangle, Flame, PlusCircle, Trash2, Save, Upload, RefreshCw, LogOut, Loader2, CheckSquare, Square, PenLine, ClipboardCopy, CheckCircle, XCircle, Copy, Download, Instagram, FileJson, FileUp
} from 'lucide-react';

// --- CONFIGURACIÓN GEMINI API ---
const apiKey = import.meta.env.MENTE_API || ""; 

// Helper para llamar a Gemini (Solo se usa para generación de categorías nuevas o pistas de contexto)
const callGemini = async (prompt, isJson = false) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: isJson ? "application/json" : "text/plain"
          }
        })
      }
    );

    if (!response.ok) throw new Error('Error en API');
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return isJson ? JSON.parse(text) : text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
};

// --- AUDIO ENGINE ---
let audioCtx = null;
let bgMusic = null; 

const initAudio = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
};

// Fallback robusto para portapapeles (SOLO execCommand para evitar permisos bloqueados)
const copyToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Asegurar que no sea visible ni afecte el layout
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    return new Promise((resolve, reject) => {
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) resolve();
        else reject(new Error("Copy failed"));
      } catch (err) {
        document.body.removeChild(textArea);
        reject(err);
      }
    });
};

const playSound = (type) => {
  try {
    const ctx = initAudio();
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.linearRampToValueAtTime(1000, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'alarm') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(440, now + 0.2); 
      osc.frequency.setValueAtTime(880, now + 0.4);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 1);
      osc.start(now);
      osc.stop(now + 1);
    } else if (type === 'reveal') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(200, now + 0.3);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'magic') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.3);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'win-faithful') {
        [440, 554, 659].forEach((freq, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g);
            g.connect(ctx.destination);
            o.type = 'triangle';
            o.frequency.value = freq;
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.1, now + 0.1 + (i*0.05));
            g.gain.exponentialRampToValueAtTime(0.001, now + 2);
            o.start(now);
            o.stop(now + 2);
        });
    } else if (type === 'win-impostor') {
        [110, 116, 164].forEach((freq, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g);
            g.connect(ctx.destination);
            o.type = 'sawtooth';
            o.frequency.value = freq;
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.1, now + 0.1);
            g.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
            o.start(now);
            o.stop(now + 2.5);
        });
    }
  } catch (e) {
    console.error("Audio error", e);
  }
};

const toggleMusic = (enable) => {
    try {
        const ctx = initAudio();
        const now = ctx.currentTime;

        if (enable) {
            if (bgOscillators.length > 0) return; 
            if (ctx.state === 'suspended') ctx.resume();
            
            bgGain = ctx.createGain();
            bgGain.connect(ctx.destination);
            bgGain.gain.setValueAtTime(0, now);
            bgGain.gain.linearRampToValueAtTime(0.02, now + 2); 

            [110, 164].forEach(freq => {
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = freq;
                osc.connect(bgGain);
                osc.start(now);
                bgOscillators.push(osc);
            });
        } else {
            if (bgGain) {
                bgGain.gain.cancelScheduledValues(now);
                bgGain.gain.linearRampToValueAtTime(0, now + 1);
                setTimeout(() => {
                    bgOscillators.forEach(osc => { try { osc.stop(); } catch(e){} });
                    bgOscillators = [];
                }, 1000);
            }
        }
    } catch (e) { console.error(e); }
};

// --- DATA: Modos de Juego ---
const GAME_MODES = [
  { id: 'normal', label: 'Clásico', sub: '(Estándar)', icon: <Users size={20}/>, desc: 'Ronda de preguntas y momento de debate.' },
  { id: 'profeta', label: 'El Profeta', sub: '(Vidente)', icon: <Eye size={20}/>, desc: 'Un fiel conoce a los Fariseos, pero NO puede revelar su rol ni votarlos directamente.' },
  { id: 'espadeo', label: 'Espadeo', sub: '(Citas)', icon: <Sword size={20}/>, desc: 'En lugar de decir una palabra, debés citar o parafrasear un versículo relacionado.' },
  { id: 'escribas', label: 'Escribas', sub: '(Dibujo)', icon: <Edit3 size={20}/>, desc: 'Nadie habla. Dibujan una pista en papel y la pasan al siguiente.' },
  { id: 'zacarias', label: 'Zacarías', sub: '(Mudo)', icon: <MicOff size={20}/>, desc: 'Un jugador al azar queda mudo. Solo puede hacer mímica. ¡Suerte si es Fariseo!' },
  { id: 'sumo', label: 'Sumo Sacerdote', sub: '(Juez)', icon: <Crown size={20}/>, desc: 'Un jugador dirige el debate desde el centro como moderador.' },
  { id: 'judas', label: 'El Judas', sub: '(Traidor)', icon: <ScrollText size={20}/>, desc: 'Un fiel sabe quién es el Fariseo. Si el Fariseo gana, Judas también gana.' },
  { id: 'babel', label: 'Babel', sub: '(Caos)', icon: <HelpCircle size={20}/>, desc: 'Cada fiel recibe una palabra distinta (pero de la misma categoría).' },
  { id: 'etiope', label: 'Etíope', sub: '(Confuso)', icon: <HelpCircle size={20}/>, desc: 'Un fiel no sabe la palabra, pero no es impostor. No puede revelar su rol.' }
];

// --- DATA: Categorías Completas ---
const createWord = (term, ref, content, active = true) => ({ term, ref, content, active });

const BASE_CATEGORIES = {
  libros: { id: 'libros', name: 'Libros Biblia', level: 'easy', words: [
    createWord('Génesis', 'Génesis 1:1', 'En el principio creó Dios los cielos y la tierra.'),
    createWord('Salmos', 'Salmos 23:1', 'El Señor es mi pastor, nada me faltará.'),
    createWord('Mateo', 'Mateo 1:1', 'Libro de la genealogía de Jesucristo, hijo de David, hijo de Abraham.'),
    createWord('Apocalipsis', 'Apocalipsis 1:1', 'La revelación de Jesucristo, que Dios le dio.'),
    createWord('Éxodo', 'Éxodo 20:1', 'Y habló Dios todas estas palabras.'),
    createWord('Proverbios', 'Proverbios 1:7', 'El temor del Señor es el principio de la sabiduría.'),
    createWord('Hechos', 'Hechos 1:8', 'Pero recibiréis poder cuando haya venido sobre vosotros el Espíritu Santo.'),
    createWord('Romanos', 'Romanos 1:16', 'Porque no me avergüenzo del evangelio, pues es poder de Dios.'),
    createWord('Jonás', 'Jonás 1:17', 'Y el Señor dispuso un gran pez que se tragara a Jonás.'),
    createWord('Daniel', 'Daniel 6:22', 'Mi Dios envió su ángel, que cerró la boca de los leones.'),
    createWord('Isaías', 'Isaías 9:6', 'Porque un niño nos ha nacido, un hijo nos ha sido dado.'),
    createWord('Lucas', 'Lucas 19:10', 'Porque el Hijo del Hombre ha venido a buscar y a salvar lo que se había perdido.'),
    createWord('Juan', 'Juan 3:16', 'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito.'),
    createWord('1 Corintios', '1 Corintios 13:13', 'Y ahora permanecen la fe, la esperanza y el amor, estos tres.'),
    createWord('Efesios', 'Efesios 2:8', 'Porque por gracia habéis sido salvados por medio de la fe.'),
    createWord('Levítico', 'Levítico 19:18', 'Amarás a tu prójimo como a ti mismo.'),
    createWord('Deuteronomio', 'Deuteronomio 6:4', 'Escucha, oh Israel, el Señor es nuestro Dios, el Señor uno es.'),
    createWord('Josué', 'Josué 1:9', '¿No te lo he ordenado yo? ¡Sé fuerte y valiente!'),
    createWord('Jueces', 'Jueces 21:25', 'En aquellos días no había rey en Israel; cada uno hacía lo que bien le parecía.'),
    createWord('Rut', 'Rut 1:16', 'Adonde tú vayas, iré yo, y donde tú mores, moraré.'),
    createWord('Eclesiastés', 'Eclesiastés 3:1', 'Hay un tiempo señalado para todo, y hay un tiempo para cada suceso.'),
    createWord('Cantares', 'Cantares 2:16', 'Mi amado es mío, y yo soy suya.'),
    createWord('Jeremías', 'Jeremías 29:11', 'Porque yo sé los planes que tengo para vosotros, declara el Señor.'),
    createWord('Ezequiel', 'Ezequiel 37:4', 'Profetiza sobre estos huesos, y diles: Huesos secos, oíd la palabra del Señor.')
  ]},
  oficios: { id: 'oficios', name: 'Oficios', level: 'easy', words: [
    createWord('Pastor', 'Salmos 23:1', 'El Señor es mi pastor, nada me faltará.'),
    createWord('Pescador', 'Mateo 4:19', 'Venid en pos de mí, y os haré pescadores de hombres.'),
    createWord('Carpintero', 'Marcos 6:3', '¿No es este el carpintero, el hijo de María?'),
    createWord('Rey', '1 Samuel 8:5', 'Constitúyenos ahora un rey para que nos juzgue, como todas las naciones.'),
    createWord('Sacerdote', 'Hebreos 4:14', 'Teniendo, pues, un gran sumo sacerdote que trascendió los cielos, Jesús.'),
    createWord('Profeta', 'Deuteronomio 18:18', 'Un profeta como tú levantaré de entre sus hermanos.'),
    createWord('Soldado', '2 Timoteo 2:3', 'Sufre penalidades conmigo, como buen soldado de Cristo Jesús.'),
    createWord('Sembrador', 'Mateo 13:3', 'He aquí, el sembrador salió a sembrar.'),
    createWord('Recaudador', 'Lucas 5:27', 'Vio a un recaudador de impuestos llamado Leví sentado en la oficina.'),
    createWord('Fariseo', 'Lucas 18:11', 'El fariseo puesto en pie, oraba para sí de esta manera.'),
    createWord('Escriba', 'Esdras 7:6', 'Este Esdras era escriba diligente en la ley de Moisés.'),
    createWord('Centurión', 'Mateo 8:5', 'Y al entrar Jesús en Capernaúm, se le acercó un centurión suplicándole.'),
    createWord('Juez', 'Jueces 2:16', 'Entonces el Señor levantó jueces que los libraron.'),
    createWord('Copero', 'Nehemías 1:11', 'Yo era entonces copero del rey.'),
    createWord('Panadero', 'Génesis 40:1', 'El copero y el panadero del rey de Egipto ofendieron a su señor.'),
    createWord('Alfarero', 'Jeremías 18:6', '¿No puedo yo hacer con vosotros, casa de Israel, lo mismo que hace este alfarero?'),
    createWord('Médico', 'Colosenses 4:14', 'Os saludan Lucas, el médico amado, y Demas.'),
    createWord('Tiendero', 'Hechos 18:3', 'Y como eran del mismo oficio... pues su oficio era hacer tiendas.')
  ]},
  animales: { id: 'animales', name: 'Animales', level: 'easy', words: [
    createWord('Oveja', 'Isaías 53:7', 'Como oveja fue llevado al matadero.'),
    createWord('León', '1 Pedro 5:8', 'Vuestro adversario, el diablo, anda como león rugiente.'),
    createWord('Serpiente', 'Génesis 3:1', 'Y la serpiente era más astuta que cualquiera de los animales del campo.'),
    createWord('Paloma', 'Mateo 3:16', 'Vio al Espíritu de Dios que descendía como paloma.'),
    createWord('Burro', 'Números 22:28', 'Entonces el Señor abrió la boca del asna.'),
    createWord('Pez', 'Jonás 1:17', 'Y el Señor dispuso un gran pez que se tragara a Jonás.'),
    createWord('Camello', 'Mateo 19:24', 'Es más fácil que un camello pase por el ojo de una aguja.'),
    createWord('Lobo', 'Mateo 7:15', 'Vienen a vosotros con vestidos de ovejas, pero por dentro son lobos rapaces.'),
    createWord('Águila', 'Isaías 40:31', 'Se remontarán con alas como las águilas.'),
    createWord('Oso', '2 Reyes 2:24', 'Salieron dos osas del bosque y despedazaron a cuarenta y dos muchachos.'),
    createWord('Cuervo', '1 Reyes 17:4', 'Y he ordenado a los cuervos que te sustenten allí.'),
    createWord('Cabra', 'Mateo 25:32', 'Separará a unos de otros, como el pastor separa las ovejas de los cabritos.'),
    createWord('Langosta', 'Marcos 1:6', 'Juan... comía langostas y miel silvestre.'),
    createWord('Rana', 'Éxodo 8:2', 'Entonces heriré todo tu territorio con ranas.'),
    createWord('Escorpión', 'Lucas 10:19', 'Os he dado autoridad para hollar serpientes y escorpiones.'),
    createWord('Zorra', 'Lucas 13:32', 'Id y decidle a ese zorro: "He aquí, expulso demonios".'),
    createWord('Mula', 'Salmos 32:9', 'No seáis como el caballo o como el mulo, que no tienen entendimiento.'),
    createWord('Hormiga', 'Proverbios 6:6', 'Ve, mira la hormiga, perezoso, observa sus caminos y sé sabio.'),
    createWord('Perro', 'Proverbios 26:11', 'Como perro que vuelve a su vómito es el necio.'),
    createWord('Ballena', 'Mateo 12:40', 'Como estuvo Jonás en el vientre del gran pez tres días.')
  ]},
  objetos: { id: 'objetos', name: 'Objetos', level: 'easy', words: [
    createWord('Arca del Pacto', 'Éxodo 25:10', 'Harán también un arca de madera de acacia.'),
    createWord('Cruz', 'Hebreos 12:2', 'Jesús... menospreciando la vergüenza, soportó la cruz.'),
    createWord('Copa', 'Lucas 22:20', 'Esta copa es el nuevo pacto en mi sangre.'),
    createWord('Túnica', 'Génesis 37:3', 'Israel amaba a José... y le hizo una túnica de muchos colores.'),
    createWord('Corona', 'Apocalipsis 2:10', 'Sé fiel hasta la muerte, y yo te daré la corona de la vida.'),
    createWord('Red', 'Lucas 5:4', 'Boga hacia lo profundo, y echad vuestras redes para pescar.'),
    createWord('Lámpara', 'Salmos 119:105', 'Lámpara es a mis pies tu palabra, y luz para mi camino.'),
    createWord('Piedra', '1 Samuel 17:49', 'David... sacó de allí una piedra y la lanzó con la honda.'),
    createWord('Vara de Aarón', 'Números 17:8', 'La vara de Aarón de la casa de Leví había retoñado.'),
    createWord('Tablas de la Ley', 'Éxodo 31:18', 'Dos tablas del testimonio, tablas de piedra escritas por el dedo de Dios.'),
    createWord('Menorá', 'Éxodo 25:31', 'Harás además un candelabro de oro puro.'),
    createWord('Honda', '1 Samuel 17:40', 'Tomó su cayado en la mano... y su honda estaba en su mano.'),
    createWord('Manto', '2 Reyes 2:13', 'Recogió también el manto de Elías que se le había caído.'),
    createWord('Trompeta', 'Josué 6:5', 'Cuando toquen prolongadamente el cuerno... el muro de la ciudad caerá.'),
    createWord('Arpa', '1 Samuel 16:23', 'David tomaba el arpa y tocaba con su mano.'),
    createWord('Altar', 'Génesis 8:20', 'Y edificó Noé un altar al Señor.'),
    createWord('Incienso', 'Salmos 141:2', 'Sea mi oración como incienso delante de ti.'),
    createWord('Aceite', 'Santiago 5:14', 'Oren por él, ungiéndole con aceite en el nombre del Señor.'),
    createWord('Pan', 'Juan 6:35', 'Jesús les dijo: Yo soy el pan de la vida.'),
    createWord('Espada', 'Hebreos 4:12', 'La palabra de Dios es viva y eficaz, y más cortante que cualquier espada.')
  ]},
  vida_jesus: { id: 'vida_jesus', name: 'Vida de Jesús', level: 'easy', words: [
    createWord('Jesús', 'Mateo 1:21', 'Y llamarás su nombre Jesús, porque Él salvará a su pueblo.'),
    createWord('Pesebre', 'Lucas 2:7', 'Y le acostó en un pesebre, porque no había lugar para ellos.'),
    createWord('Bautismo', 'Marcos 1:9', 'Jesús vino de Nazaret... y fue bautizado por Juan en el Jordán.'),
    createWord('Tentación', 'Mateo 4:1', 'Entonces Jesús fue llevado por el Espíritu al desierto para ser tentado.'),
    createWord('Transfiguración', 'Mateo 17:2', 'Y se transfiguró delante de ellos; y su rostro resplandeció.'),
    createWord('Última Cena', 'Lucas 22:15', 'Intensamente he deseado comer esta Pascua con vosotros.'),
    createWord('Crucifixión', 'Juan 19:18', 'Allí le crucificaron, y con Él a otros dos.'),
    createWord('Resurrección', 'Lucas 24:6', 'No está aquí, sino que ha resucitado.'),
    createWord('Ascensión', 'Hechos 1:9', 'Fue alzado, y una nube le recibió y le ocultó de sus ojos.'),
    createWord('Pedro', 'Mateo 16:18', 'Tú eres Pedro, y sobre esta roca edificaré mi iglesia.'),
    createWord('Juan', 'Juan 13:23', 'Uno de sus discípulos, el que Jesús amaba.'),
    createWord('Jacobo', 'Mateo 4:21', 'Vio a otros dos hermanos, Jacobo hijo de Zebedeo y Juan.'),
    createWord('Andrés', 'Juan 1:40', 'Andrés, hermano de Simón Pedro, era uno de los dos.'),
    createWord('Felipe', 'Juan 1:43', 'Jesús... halló a Felipe y le dijo: Sígueme.'),
    createWord('Bartolomé', 'Mateo 10:3', 'Felipe y Bartolomé; Tomás y Mateo.'),
    createWord('Mateo', 'Mateo 9:9', 'Vio a un hombre llamado Mateo... y le dijo: Sígueme.'),
    createWord('Tomás', 'Juan 20:27', 'Luego dijo a Tomás: Pon aquí tu dedo, y mira mis manos.'),
    createWord('Santiago Alfeo', 'Marcos 3:18', 'Andrés, Felipe, Bartolomé, Mateo, Tomás, Jacobo hijo de Alfeo.'),
    createWord('Tadeo', 'Mateo 10:3', 'Jacobo hijo de Alfeo, y Lebeo, por sobrenombre Tadeo.'),
    createWord('Simón Zelote', 'Lucas 6:15', 'Mateo, Tomás, Jacobo hijo de Alfeo, Simón llamado Zelote.'),
    createWord('Judas Iscariote', 'Lucas 22:48', 'Judas, ¿con un beso entregas al Hijo del Hombre?'),
    createWord('Lázaro', 'Juan 11:43', 'Gritó a gran voz: ¡Lázaro, ven fuera!'),
    createWord('Marta', 'Lucas 10:41', 'Marta, Marta, afanada y turbada estás con muchas cosas.'),
    createWord('María', 'Lucas 10:42', 'María ha escogido la buena parte.'),
    createWord('Zaqueo', 'Lucas 19:5', 'Zaqueo, date prisa y desciende, porque hoy debo quedarme en tu casa.'),
    createWord('Nicodemo', 'Juan 3:4', 'Nicodemo le dijo: ¿Cómo puede un hombre nacer siendo viejo?'),
    createWord('Pilato', 'Mateo 27:24', 'Pilato... tomó agua y se lavó las manos delante de la multitud.'),
    createWord('Caifás', 'Juan 11:49', 'Caifás, que era sumo sacerdote aquel año.'),
    createWord('Barrabás', 'Marcos 15:15', 'Pilato... les soltó a Barrabás.'),
    createWord('Centurión', 'Marcos 15:39', 'Verdaderamente este hombre era Hijo de Dios.'),
    createWord('Mujer Samaritana', 'Juan 4:7', 'Una mujer de Samaria vino a sacar agua.'),
    createWord('José de Arimatea', 'Marcos 15:43', 'José de Arimatea... tuvo el valor de ir a Pilato y pedir el cuerpo de Jesús.'),
    createWord('Simón de Cirene', 'Lucas 23:26', 'Echaron mano a un tal Simón de Cirene... y le pusieron la cruz encima.')
  ]},
  profetas: { id: 'profetas', name: 'Profetas', level: 'medium', words: [createWord('Moisés', 'Deut 34'), createWord('Elías', '2 Rey 2'), createWord('Isaías', 'Isa 6'), createWord('Jeremías', 'Jer 1'), createWord('Jonás', 'Jon 1'), createWord('Daniel', 'Dan 6'), createWord('Samuel', '1 Sam 3'), createWord('Juan Bautista', 'Mat 3'), createWord('David', 'Salmos'), createWord('Noé', 'Gen 6'), createWord('Eliseo', '2 Rey 2'), createWord('Ezequiel', 'Eze 1'), createWord('Oseas', 'Os 1'), createWord('Joel', 'Joel 1'), createWord('Amós', 'Am 1'), createWord('Abdías', 'Abd 1'), createWord('Miqueas', 'Miq 1'), createWord('Nahúm', 'Nah 1'), createWord('Habacuc', 'Hab 1'), createWord('Sofonías', 'Sof 1'), createWord('Hageo', 'Hag 1'), createWord('Zacarías', 'Zac 1'), createWord('Malaquías', 'Mal 1'), createWord('Natán', '2 Sam 12'), createWord('Gad', '1 Sam 22'), createWord('Balaam', 'Num 22'), createWord('Débora', 'Jue 4'), createWord('Ana', 'Luc 2'), createWord('Agabo', 'Hech 11')] },
  milagros: { id: 'milagros', name: 'Milagros', level: 'medium', words: [createWord('Agua en vino', 'Jn 2'), createWord('Mar Rojo', 'Ex 14'), createWord('Lázaro resucita', 'Jn 11'), createWord('Panes y Peces', 'Mat 14'), createWord('Caminar sobre agua', 'Mat 14'), createWord('Ciego Bartimeo', 'Mar 10'), createWord('Paralítico del techo', 'Mar 2'), createWord('Hija de Jairo', 'Mar 5'), createWord('Mujer flujo sangre', 'Mar 5'), createWord('10 Leprosos', 'Luc 17'), createWord('Tempestad calmada', 'Mar 4'), createWord('Moneda en el pez', 'Mat 17'), createWord('Higuera seca', 'Mar 11'), createWord('Oreja de Malco', 'Luc 22'), createWord('Pesca milagrosa', 'Luc 5'), createWord('Muros de Jericó', 'Jos 6'), createWord('Sol detenido', 'Jos 10'), createWord('Fuego del cielo', '1 Rey 18'), createWord('Naamán sanado', '2 Rey 5'), createWord('Mano seca', 'Mat 12')] },
  mujeres: { id: 'mujeres', name: 'Mujeres', level: 'medium', words: [createWord('María', 'Luc 1'), createWord('Eva', 'Gen 3'), createWord('Sara', 'Gen 17'), createWord('Ester', 'Ester 4'), createWord('Rut', 'Rut 1'), createWord('Dalila', 'Jue 16'), createWord('María Magdalena', 'Luc 8'), createWord('Marta', 'Luc 10'), createWord('Rahab', 'Jos 2'), createWord('Rebeca', 'Gen 24'), createWord('Raquel', 'Gen 29'), createWord('Lea', 'Gen 29'), createWord('Miriam', 'Ex 15'), createWord('Débora', 'Jue 4'), createWord('Jael', 'Jue 4'), createWord('Ana', '1 Sam 1'), createWord('Abigail', '1 Sam 25'), createWord('Betsabé', '2 Sam 11'), createWord('Sunamita', '2 Rey 4'), createWord('Elisabeth', 'Luc 1'), createWord('Lidia', 'Hech 16'), createWord('Priscila', 'Hech 18'), createWord('Febe', 'Rom 16'), createWord('Agar', 'Gen 16'), createWord('Dina', 'Gen 34'), createWord('Tamar', 'Gen 38'), createWord('Sifrá', 'Ex 1'), createWord('Fúa', 'Ex 1'), createWord('Jezabel', '1 Rey 21'), createWord('Atalía', '2 Rey 11')] },
  lugares: { id: 'lugares', name: 'Lugares', level: 'medium', words: [createWord('Jerusalén', 'Ciudad de Paz'), createWord('Belén', 'Casa de Pan'), createWord('Nazaret', 'Hogar de Jesús'), createWord('Galilea', 'Región Norte'), createWord('Jordán', 'Lugar de Bautismo'), createWord('Egipto', 'Tierra de esclavitud'), createWord('Sinaí', 'Monte de la Ley'), createWord('Jericó', 'Ciudad de las palmeras'), createWord('Getsemaní', 'Lugar de prensa de aceite'), createWord('Gólgota', 'Lugar de la Calavera'), createWord('Betania', 'Casa de dátiles'), createWord('Cafarnaúm', 'Aldea de Nahúm'), createWord('Emaús', 'Camino de revelación'), createWord('Sodoma', 'Ciudad destruida'), createWord('Nínive', 'Gran ciudad'), createWord('Babilonia', 'Ciudad de confusión'), createWord('Roma', 'Capital del Imperio'), createWord('Patmos', 'Isla del Apocalipsis'), createWord('Caná', 'Lugar de bodas'), createWord('Monte de los Olivos', 'Lugar de Ascensión'), createWord('Monte Carmelo', 'Desafío de Elías'), createWord('Monte Tabor', 'Transfiguración'), createWord('Mar Muerto', 'Mar Salado'), createWord('Ur', 'De los Caldeos'), createWord('Antioquía', 'Primeros Cristianos')] },
  reyes: { id: 'reyes', name: 'Reyes', level: 'medium', words: [createWord('David', '2 Sam 5'), createWord('Salomón', '1 Rey 1'), createWord('Saúl', '1 Sam 10'), createWord('Herodes el Grande', 'Mat 2'), createWord('Faraón', 'Ex 5'), createWord('Nabucodonosor', 'Dan 2'), createWord('Ezequías', '2 Rey 18'), createWord('Is-boset', '2 Sam 2'), createWord('Roboam', '1 Rey 12'), createWord('Abiam', '1 Rey 15'), createWord('Asa', '1 Rey 15'), createWord('Josafat', '1 Rey 22'), createWord('Joram', '2 Rey 8'), createWord('Ocozías', '2 Rey 8'), createWord('Joás', '2 Rey 11'), createWord('Amasías', '2 Rey 14'), createWord('Uzías', '2 Rey 15'), createWord('Jotam', '2 Rey 15'), createWord('Acaz', '2 Rey 16'), createWord('Manasés', '2 Rey 21'), createWord('Amón', '2 Rey 21'), createWord('Josías', '2 Rey 22'), createWord('Joacim', '2 Rey 23'), createWord('Sedequías', '2 Rey 24'), createWord('Ciro', 'Esd 1'), createWord('Darío', 'Dan 6'), createWord('Artajerjes', 'Neh 2'), createWord('Agripa', 'Hech 26'), createWord('Herodes Antipas', 'Luc 23')] },
  bandas: { id: 'bandas', name: 'Música Cristiana', level: 'medium', words: [
    createWord('Hillsong', 'Australia', 'Banda de adoración australiana famosa por "Oceans".'),
    createWord('Redimi2', 'Rep. Dom.', 'Rapero cristiano dominicano conocido por letras radicales.'),
    createWord('Marcos Witt', 'México', 'Pionero de la alabanza y adoración en español.'),
    createWord('Jesús Adrián Romero', 'México', 'Cantante y compositor de música pop cristiana.'),
    createWord('Tercer Cielo', 'Dúo', 'Dúo de música pop contemporánea, esposos.'),
    createWord('Barak', 'Rep. Dom.', 'Grupo de adoración conocido por "Espíritu Santo".'),
    createWord('Miel San Marcos', 'Guatemala', 'Banda guatemalteca de alabanza y adoración.'),
    createWord('Christine D\'Clario', 'USA', 'Líder de adoración conocida por su potente voz.'),
    createWord('Rescate', 'Argentina', 'Banda argentina de rock gospel.'),
    createWord('Funky', 'P. Rico', 'Cantante puertorriqueño de música urbana cristiana.'),
    createWord('Majo y Dan', 'México', 'Matrimonio mexicano de música folk/pop.'),
    createWord('Un Corazón', 'México', 'Movimiento de música indie/worship joven.'),
    createWord('Alex Campos', 'Colombia', 'Cantante colombiano de rock/pop cristiano.'),
    createWord('Marcela Gándara', 'México', 'Cantante mexicana de música cristiana.'),
    createWord('Lilly Goodman', 'Rep. Dom.', 'Cantante dominicana con una voz prodigiosa.'),
    createWord('Generación 12', 'Colombia', 'Banda de adoración de la iglesia MCI.'),
    createWord('Elevation Worship', 'USA', 'Banda de adoración de Elevation Church.'),
    createWord('Bethel Music', 'USA', 'Colectivo de adoración de Bethel Church.'),
    createWord('Maverick City', 'USA', 'Colectivo musical que rompe barreras culturales.'),
    createWord('Gateway Worship', 'USA', 'Equipo de adoración de Gateway Church.')
  ]},
  random: { id: 'random', name: 'Biblical Random', level: 'medium', words: [createWord('Fe', 'Heb 11'), createWord('Gracia', 'Efe 2:8'), createWord('Pecado', 'Rom 3:23'), createWord('Diezmo', 'Mal 3'), createWord('Ayuno', 'Isa 58'), createWord('Oración', '1 Tes 5:17'), createWord('Bautismo', 'Rom 6'), createWord('Santa Cena', '1 Cor 11'), createWord('Santidad', '1 Ped 1:16'), createWord('Perdón', 'Col 3:13'), createWord('Arrepentimiento', 'Hech 3:19'), createWord('Salvación', 'Hech 4:12'), createWord('Gloria', 'Rom 3:23'), createWord('Alabanza', 'Sal 150'), createWord('Adoración', 'Jn 4:23'), createWord('Justificación', 'Rom 5:1'), createWord('Redención', 'Efe 1:7'), createWord('Pacto', 'Jer 31'), createWord('Ley', 'Gal 3'), createWord('Evangelio', 'Rom 1:16')] },
  reformadores: { id: 'reformadores', name: 'Reformadores', level: 'hard', words: [
    createWord('Lutero', 'Alemania', 'Teólogo alemán que inició la Reforma Protestante con sus 95 tesis.'),
    createWord('Calvino', 'Ginebra', 'Teólogo francés, autor de "La Institución de la Religión Cristiana".'),
    createWord('Spurgeon', 'Londres', 'Conocido como el "Príncipe de los Predicadores" bautista.'),
    createWord('Wesley', 'Inglaterra', 'Clérigo anglicano y teólogo, fundador del Metodismo.'),
    createWord('Knox', 'Escocia', 'Líder de la Reforma Protestante en Escocia y fundador del presbiterianismo.'),
    createWord('Zuinglio', 'Suiza', 'Líder de la Reforma Protestante en Suiza.'),
    createWord('Wycliffe', 'Inglaterra', 'Teólogo inglés, conocido como la "Estrella Matutina de la Reforma".'),
    createWord('Tyndale', 'Inglaterra', 'Traductor de la Biblia al inglés, ejecutado por su fe.'),
    createWord('Jan Hus', 'Bohemia', 'Precursor de la Reforma, quemado en la hoguera.'),
    createWord('Jonathan Edwards', 'USA', 'Teólogo del Primer Gran Despertar, "Pecadores en manos de un Dios airado".'),
    createWord('Whitefield', 'Inglaterra', 'Predicador evangelista del Gran Despertar.'),
    createWord('Moody', 'Chicago', 'Evangelista y editor estadounidense, fundador de la Iglesia Moody.'),
    createWord('Bonhoeffer', 'Alemania', 'Teólogo luterano y mártir antinazi, "El Costo del Discipulado".'),
    createWord('C.S. Lewis', 'Inglaterra', 'Apologista cristiano, autor de "Mero Cristianismo" y Narnia.'),
    createWord('Billy Graham', 'USA', 'Evangelista estadounidense que predicó a millones en estadios.')
  ]},
  villanos: { id: 'villanos', name: 'Villanos', level: 'hard', words: [createWord('Goliat', '1 Samuel 17', 'Gigante filisteo derrotado por David.'), createWord('Judas Iscariote', 'Mateo 26', 'Discípulo que traicionó a Jesús por 30 monedas.'), createWord('Poncio Pilatos', 'Mateo 27', 'Gobernador que condenó a Jesús y se lavó las manos.'), createWord('Jezabel', '1 Reyes 21', 'Reina malvada que persiguió a Elías.'), createWord('Caín', 'Génesis 4', 'Primer hijo de Adán y Eva, mató a su hermano Abel.'), createWord('Satanás', 'Job 1', 'El adversario, tentador y padre de mentira.'), createWord('Caifás', 'Mateo 26', 'Sumo Sacerdote que conspiró para matar a Jesús.'), createWord('Amán', 'Ester 3', 'Funcionario persa que planeó exterminar a los judíos.'), createWord('Herodes el Grande', 'Mateo 2', 'Rey que ordenó la matanza de los inocentes en Belén.'), createWord('Dalila', 'Jueces 16', 'Mujer que traicionó a Sansón cortándole el cabello.'), createWord('Absalón', '2 Samuel 15', 'Hijo de David que se rebeló contra su padre.'), createWord('Balaam', 'Números 22', 'Profeta que intentó maldecir a Israel por dinero.'), createWord('Antíoco Epífanes', 'Daniel 11', 'Rey que profanó el templo (figura profética).'), createWord('Sanbalat', 'Nehemías 4', 'Gobernador que se opuso a la reconstrucción de Jerusalén.'), createWord('Faraón', 'Éxodo 5', 'Rey de Egipto que endureció su corazón contra Dios.'), createWord('La Bestia', 'Apocalipsis 13', 'Figura del fin de los tiempos opuesta a Dios.')] }
};

// --- ICONOS ---
const AppIcon = () => (
    <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center shadow-md overflow-hidden">
        <svg viewBox="0 0 100 100" className="w-8 h-8 scale-150 translate-y-1">
             <path d="M20 90 L 20 20 L 80 20 L 80 90 Z" className="fill-slate-900" /> 
             <path d="M20 20 L 20 10 Q 50 -5 80 10 L 80 20" className="fill-slate-800" /> 
             <path d="M30 25 L 30 55 Q 50 70 70 55 L 70 25 Z" className="fill-amber-100" /> 
             <path d="M35 35 L 45 37" className="stroke-slate-900 stroke-[3px]" />
             <path d="M55 37 L 65 35" className="stroke-slate-900 stroke-[3px]" />
             <circle cx="40" cy="40" r="2.5" className="fill-slate-900" />
             <circle cx="60" cy="40" r="2.5" className="fill-slate-900" />
             <path d="M40 50 Q 50 53 60 50" className="stroke-slate-900 stroke-[2px] fill-none" />
             <path d="M30 50 Q 50 80 70 50 L 70 45 L 30 45 Z" className="fill-slate-800" /> 
        </svg>
    </div>
);

const PhariseeMascot = ({ onClick, speech, scale = 1, showBody = true }) => (
  <div className={`relative w-40 h-40 mx-auto cursor-pointer group ${scale === 1 ? 'mt-16 mb-4 z-0' : 'z-0'}`} style={{ transform: `scale(${scale})` }} onClick={onClick}>
     {speech && (
         <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-white text-slate-900 text-xs font-bold p-3 rounded-xl shadow-xl w-52 text-center animate-in fade-in zoom-in border-2 border-slate-800 z-0">
             "{speech}"
             <div className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b-2 border-r-2 border-slate-800 transform rotate-45"></div>
         </div>
     )}
     <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl transition-transform group-hover:scale-105" fill="none" stroke="none">
        {/* Túnica Negra */}
        <path d="M15 90 L 15 30 L 85 30 L 85 90 Z" className="fill-slate-900" />
        <path d="M15 30 Q 50 100 85 30" className="fill-slate-800" /> 
        
        {/* Sombrero */}
        <path d="M20 30 L 20 10 Q 50 -5 80 10 L 80 30" className="fill-slate-800" />
        <rect x="25" y="25" width="50" height="8" className="fill-slate-950" />

        {/* Cara */}
        <path d="M30 35 L 30 70 Q 50 85 70 70 L 70 35 Z" className="fill-amber-100" />
        
        {/* Cejas (Animated) */}
        <g className="animate-pulse"> 
            <path d="M35 45 L 45 48" className="stroke-slate-900 stroke-[3px]" />
            <path d="M55 48 L 65 45" className="stroke-slate-900 stroke-[3px]" />
        </g>

        {/* Ojos */}
        <circle cx="40" cy="50" r="3" className="fill-slate-900" />
        <circle cx="60" cy="50" r="3" className="fill-slate-900" />

        {/* Barba */}
        <path d="M30 65 Q 50 95 70 65 L 70 60 L 30 60 Z" className="fill-slate-800" />
        
        {/* Boca (Blanca y con contraste/sombra) */}
        <path d="M45 75 Q 50 72 55 75" className="stroke-white stroke-[3px] fill-none drop-shadow-md" />
     </svg>
  </div>
);

const CurlyHairIcon = () => (
    <svg viewBox="0 0 100 100" className="w-12 h-12 mx-auto mb-1">
        <circle cx="50" cy="60" r="20" className="fill-indigo-100"/>
        <path d="M30 50 Q 35 30 50 30 Q 65 30 70 50" className="fill-none stroke-slate-800 stroke-[3px]"/>
        <circle cx="30" cy="45" r="5" className="fill-slate-800"/>
        <circle cx="35" cy="35" r="5" className="fill-slate-800"/>
        <circle cx="45" cy="30" r="5" className="fill-slate-800"/>
        <circle cx="55" cy="30" r="5" className="fill-slate-800"/>
        <circle cx="65" cy="35" r="5" className="fill-slate-800"/>
        <circle cx="70" cy="45" r="5" className="fill-slate-800"/>
        <circle cx="43" cy="60" r="2" className="fill-slate-900"/>
        <circle cx="57" cy="60" r="2" className="fill-slate-900"/>
        <path d="M45 70 Q 50 75 55 70" className="stroke-slate-900 stroke-[2px] fill-none"/>
    </svg>
);

// --- COMPONENTES AUX ---
const Button = ({ onClick, children, variant = 'primary', className = '', disabled = false, playClick = true }) => {
  const handleClick = (e) => {
    if (playClick) playSound('click');
    if (onClick) onClick(e);
  };
  const baseStyle = "w-full py-3 px-4 rounded-lg font-bold transition-all transform active:scale-95 shadow-md flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white border-b-4 border-indigo-800",
    secondary: "bg-amber-500 hover:bg-amber-600 text-white border-b-4 border-amber-700",
    danger: "bg-red-500 hover:bg-red-600 text-white border-b-4 border-red-700",
    outline: "bg-white text-slate-700 border-2 border-slate-200 hover:bg-slate-50",
    ghost: "bg-transparent text-indigo-300 hover:text-white"
  };
  return (
    <button onClick={handleClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-xl p-5 ${className}`}>
    {children}
  </div>
);

const Modal = ({ isOpen, onClose, title, children, triggerSound, zIndex = "z-50" }) => {
  if (!isOpen) return null;
  return (
    <div className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in`}>
      <div className="bg-white rounded-xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={() => { if(triggerSound) triggerSound('click'); onClose(); }} className="p-1 hover:bg-slate-200 rounded-full"><X size={20} className="text-slate-500"/></button>
        </div>
        <div className="p-5 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

const Toast = ({ message, onClose }) => (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg z-[80] flex items-center gap-2 text-sm animate-in fade-in slide-in-from-bottom-2">
        <CheckCircle size={16} className="text-green-400"/>
        {message}
    </div>
);

const HighlightedText = ({ text, term }) => {
  if (!text || !term) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${term})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) => 
        part.toLowerCase() === term.toLowerCase() ? <span key={i} className="font-bold text-indigo-700 bg-indigo-100 px-1 rounded">{part}</span> : part
      )}
    </span>
  );
};

// --- APP PRINCIPAL ---

export default function App() {
  const [gameState, setGameState] = useState('setup'); 
  const [players, setPlayers] = useState([
    { id: 1, name: 'Jugador 1', isDead: false },
    { id: 2, name: 'Jugador 2', isDead: false },
    { id: 3, name: 'Jugador 3', isDead: false }
  ]);
  
  // Configuración
  const [impostorCount, setImpostorCount] = useState(1);
  const [categories, setCategories] = useState(BASE_CATEGORIES);
  const [selectedCats, setSelectedCats] = useState(['libros', 'oficios', 'animales', 'objetos', 'vida_jesus']); 
  const [timerDuration, setTimerDuration] = useState(1); 
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [gameModeIndex, setGameModeIndex] = useState(0); 
  const [gameFlow, setGameFlow] = useState('sanedrin'); 
  const [showCategoryToImpostor, setShowCategoryToImpostor] = useState(true);
  const [aiHintEnabled, setAiHintEnabled] = useState(false);
  const [aiContextEnabled, setAiContextEnabled] = useState(false); 
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true); 
  const [vigiliaModeEnabled, setVigiliaModeEnabled] = useState(false);
  const [partyStats, setPartyStats] = useState({}); 
  const [vigiliaRounds, setVigiliaRounds] = useState(0);

  // UI States
  const [customTopic, setCustomTopic] = useState('');
  const [customWordInput, setCustomWordInput] = useState('');
  const [customRefInput, setCustomRefInput] = useState(''); 
  const [isGeneratingCat, setIsGeneratingCat] = useState(false);
  const [generatedAiHint, setGeneratedAiHint] = useState('');
  const [generatedAiContext, setGeneratedAiContext] = useState(''); 
  const [isGeneratingHint, setIsGeneratingHint] = useState(false);
  const [showCustomWordsModal, setShowCustomWordsModal] = useState(false);
  const [vigiliaRollIndex, setVigiliaRollIndex] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showResultModal, setShowResultModal] = useState(null); 
  const [showResetStatsConfirm, setShowResetStatsConfirm] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [selectedVotes, setSelectedVotes] = useState([]); 
  const [showVerseModal, setShowVerseModal] = useState(null);
  const [showContextModal, setShowContextModal] = useState(false);
  const [fileInputRef, setFileInputRef] = useState(null);
  
  // States for Category Editing
  const [previewCatId, setPreviewCatId] = useState(null);
  const [editingCatTitle, setEditingCatTitle] = useState(false);
  const [newCatTitle, setNewCatTitle] = useState("");

  // Game Logic State
  const [gameData, setGameData] = useState(null);
  const [currentRevealIndex, setCurrentRevealIndex] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [infoTab, setInfoTab] = useState('instructions');
  const [mascotSpeech, setMascotSpeech] = useState("");
  const [backupText, setBackupText] = useState("");

  // Music & Sound Manager
  useEffect(() => {
      if (!bgMusic) {
          bgMusic = new Audio('https://cdn.pixabay.com/download/audio/2024/05/14/audio_4db548b12d.mp3');
          bgMusic.loop = true;
          bgMusic.volume = 0.25;
      }

      const shouldPlay = musicEnabled && gameState !== 'setup' && gameState !== 'result-faithful' && gameState !== 'result-impostor';
      
      if (shouldPlay) {
          bgMusic.play().catch(e => console.log("Audio play failed", e));
      } else {
          bgMusic.pause();
      }
  }, [musicEnabled, gameState]);

  const triggerSound = (type) => { if (soundEnabled) playSound(type); };

  // --- HELPER UI ---
  const showNotification = (msg) => {
      setToastMessage(msg);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
  };

  // --- MASCOTA ---
  const handleMascotClick = () => {
      triggerSound('click');
      const phrases = [
          "¿Seguro que oraste?", 
          "Yo ayuno dos veces por semana.", 
          "¿Nazaret? Pff.", 
          "A ver si tenés discernimiento...", 
          "Me parece que ese es publicano.", 
          "Vos no sabés nada de la Ley.", 
          "¿Pagaste el diezmo?", 
          "Esa vestimenta no es santa...",
          "¿Eso es doctrina sana?",
          "Le falta sal a tu vida.",
          "Cuidado con la levadura...",
          "Yo me sé el Pentateuco de memoria.",
          "¿Ese himno es de los viejos o de los 'modernos'?",
          "Mucha gracia, poca ley.",
          "Te vi llegando tarde al culto.",
          "La ofrenda no es opcional, eh.",
          "¿Estás en comunión o solo de visita?",
          "A mí nadie me impuso las manos todavía."
      ];
      setMascotSpeech(phrases[Math.floor(Math.random() * phrases.length)]);
      setTimeout(() => setMascotSpeech(""), 5000);
  };

  // --- CATEGORÍAS & PALABRAS ---
  const applyPreset = (level) => {
      triggerSound('click');
      let newSelection = [];
      if (level === 'easy') newSelection = ['libros', 'oficios', 'animales', 'objetos', 'vida_jesus'];
      else if (level === 'medium') newSelection = ['libros', 'oficios', 'animales', 'objetos', 'vida_jesus', 'profetas', 'milagros', 'lugares', 'random'];
      else newSelection = Object.keys(categories);
      setSelectedCats(newSelection);
  };

  const handleAddCustomWord = () => {
      if (!customWordInput.trim()) return;
      const word = customWordInput.trim();
      const ref = customRefInput.trim() || 'Agregada';
      setCategories(prev => ({
          ...prev,
          custom_added: {
              id: 'custom_added',
              name: 'Palabras Agregadas',
              words: [...(prev.custom_added?.words || []), { term: word, ref: ref, active: true }]
          }
      }));
      if (!selectedCats.includes('custom_added')) setSelectedCats(prev => [...prev, 'custom_added']);
      setCustomWordInput('');
      setCustomRefInput('');
      triggerSound('click');
  };

  const handleDeleteCustomWord = (term) => {
      setCategories(prev => {
          const newWords = prev.custom_added.words.filter(w => w.term !== term);
          if (newWords.length === 0) {
              const newCats = {...prev};
              delete newCats.custom_added;
              return newCats;
          }
          return { ...prev, custom_added: { ...prev.custom_added, words: newWords }};
      });
  };

  const handleGenerateCategory = async () => {
    if (!customTopic.trim()) return;
    setIsGeneratingCat(true);
    triggerSound('magic');
    const prompt = `Genera una lista de 25 palabras o conceptos bíblicos relacionados con el tema: "${customTopic}". Devuelve SOLO un array JSON válido sin markdown. Formato: [{ "term": "Palabra", "ref": "Cita Bíblica Corta (ej Juan 3:16)" }]. Lenguaje: Español.`;
    const result = await callGemini(prompt, true);
    if (result && Array.isArray(result)) {
        const newId = `custom_${Date.now()}`;
        const words = result.map(w => ({ ...w, active: true }));
        const newCat = { id: newId, name: `✨ ${customTopic}`, words: words };
        setCategories(prev => ({ ...prev, [newId]: newCat }));
        setSelectedCats(prev => [...prev, newId]);
        setCustomTopic('');
    } else {
        alert("No se pudo invocar la sabiduría necesaria.");
    }
    setIsGeneratingCat(false);
  };

  const toggleCategory = (catId) => {
    triggerSound('click');
    setSelectedCats(prev => prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]);
  };

  const toggleAllCategories = () => {
    triggerSound('click');
    setSelectedCats(selectedCats.length === Object.keys(categories).length ? [] : Object.keys(categories));
  };

  const toggleWordActive = (catId, term) => {
      setCategories(prev => ({
          ...prev,
          [catId]: {
              ...prev[catId],
              words: prev[catId].words.map(w => w.term === term ? { ...w, active: !w.active } : w)
          }
      }));
  };

  const saveCatTitle = (catId) => {
      if (newCatTitle.trim()) {
          setCategories(prev => ({
              ...prev,
              [catId]: { ...prev[catId], name: newCatTitle }
          }));
      }
      setEditingCatTitle(false);
  };

  const showVerseContent = (word) => {
      triggerSound('click');
      setShowVerseModal({ 
          title: word.ref, 
          content: word.content || "Información no disponible.", 
          term: word.term 
      });
  };

  // --- JUGADORES & PREFS ---
  const handlePlayerCountChange = (delta) => {
    triggerSound('click');
    setPlayers(prev => {
      if (delta > 0) return [...prev, { id: Date.now(), name: `Jugador ${prev.length + 1}`, isDead: false }];
      if (prev.length <= 3) return prev;
      return prev.slice(0, -1);
    });
  };

  const updateName = (id, newName) => setPlayers(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));

  // --- EXPORT & IMPORT OPTIMIZED ---
  const exportData = async () => {
      triggerSound('click');

      // Optimización: Solo guardar lo que cambia o es custom
      const customCategories = {};
      const inactiveWords = [];
      const renamedBaseCats = {};

      Object.keys(categories).forEach(catId => {
          const cat = categories[catId];
          
          if (catId.startsWith('custom_')) {
              // Categorías totalmente personalizadas (IA o Agregadas)
              customCategories[catId] = cat;
          } else {
              // Categorías base: Solo guardar cambios
              if (BASE_CATEGORIES[catId] && cat.name !== BASE_CATEGORIES[catId].name) {
                  renamedBaseCats[catId] = cat.name;
              }
              cat.words.forEach(w => {
                  if (w.active === false) {
                      inactiveWords.push({ catId, term: w.term });
                  }
              });
          }
      });

      const data = { 
          version: 2, // Versionamiento por si acaso
          players, 
          partyStats, 
          vigiliaModeEnabled,
          vigiliaRounds,
          customCategories,
          renamedBaseCats,
          inactiveWords,
          selectedCats, // Guardar selección activa
          settings: { impostorCount, timerDuration, timerEnabled, gameFlow, showCategoryToImpostor, aiHintEnabled, vibrationEnabled, aiContextEnabled }
      };
      
      const text = JSON.stringify(data);
      setBackupText(text);
      setShowBackupModal(true); 
  };

  const downloadBackupFile = () => {
      const blob = new Blob([backupText], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `fariseo_backup_${new Date().toISOString().slice(0,10)}.sav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      playSound('success');
  };

  const handleFileUpload = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          setBackupText(e.target.result);
          // Auto-trigger import after load? No, let user review or click load.
          showNotification("Archivo cargado. Click en 'Cargar Datos' para aplicar.");
      };
      reader.readAsText(file);
  };

  const importData = () => {
      triggerSound('click');
      try {
          const data = JSON.parse(backupText);
          
          if(data.players) setPlayers(data.players);
          if(data.partyStats) setPartyStats(data.partyStats);
          if(data.vigiliaModeEnabled !== undefined) setVigiliaModeEnabled(data.vigiliaModeEnabled);
          if(data.vigiliaRounds) setVigiliaRounds(data.vigiliaRounds);
          if(data.settings) {
              setImpostorCount(data.settings.impostorCount);
              setTimerDuration(data.settings.timerDuration);
              setTimerEnabled(data.settings.timerEnabled);
              setGameFlow(data.settings.gameFlow);
              setShowCategoryToImpostor(data.settings.showCategoryToImpostor);
              setAiHintEnabled(data.settings.aiHintEnabled);
              setVibrationEnabled(data.settings.vibrationEnabled);
              setAiContextEnabled(data.settings.aiContextEnabled);
          }
          if(data.selectedCats) setSelectedCats(data.selectedCats);

          // Reconstruir Categorías
          let newCategories = JSON.parse(JSON.stringify(BASE_CATEGORIES)); // Deep copy base

          // 1. Restaurar títulos renombrados
          if (data.renamedBaseCats) {
              Object.keys(data.renamedBaseCats).forEach(catId => {
                  if (newCategories[catId]) newCategories[catId].name = data.renamedBaseCats[catId];
              });
          }

          // 2. Restaurar palabras desactivadas
          if (data.inactiveWords) {
              data.inactiveWords.forEach(({ catId, term }) => {
                  if (newCategories[catId]) {
                      const wIndex = newCategories[catId].words.findIndex(w => w.term === term);
                      if (wIndex !== -1) newCategories[catId].words[wIndex].active = false;
                  }
              });
          }

          // 3. Fusionar custom categories (v2 optimization)
          if (data.customCategories) {
              newCategories = { ...newCategories, ...data.customCategories };
          } 
          // Soporte Legacy (si el usuario pega un JSON de la versión anterior)
          else if (data.categories) {
               newCategories = data.categories; // Overwrite completely if legacy
          }

          setCategories(newCategories);

          playSound('success');
          setGameState('setup');
          setGameData(null);
          setCurrentRevealIndex(0);
          setIsRevealing(false);
          setShowResultModal({ type: 'success', title: '¡Restaurado!', msg: 'Datos cargados correctamente.' });
          setShowBackupModal(false);
      } catch (e) { 
          console.error(e);
          playSound('error');
          setShowResultModal({ type: 'error', title: 'Error al Cargar', msg: 'El archivo o texto es inválido.' });
      }
  };

  const handleOpenBackup = () => {
      exportData(); 
  };

  // --- GAMEPLAY ---
  const handleReset = () => {
    // Si estamos en vigilia, NO borramos datos, solo volvemos a setup
    setGameState('setup');
    setGameData(null);
    setCurrentRevealIndex(0);
    setIsRevealing(false);
    setGeneratedAiHint('');
    setGeneratedAiContext('');
    setSelectedVotes([]);
    // No borramos stats aqui, solo en clearStats
    if (!vigiliaModeEnabled) setPartyStats({});
  };

  const confirmResetStats = () => {
      setPartyStats({});
      setVigiliaRounds(0);
      setShowResetStatsConfirm(false);
      triggerSound('click');
  }

  const clearStats = () => {
      setShowResetStatsConfirm(true);
  }

  const startGame = async (retryData = null) => {
    let currentPlayers = players;
    if (retryData) currentPlayers = retryData.originalPlayers.map(p => ({...p, isDead: false}));
    if (!retryData && selectedCats.length === 0) return alert("¡Elegí categorías, che!");

    const validCats = selectedCats.filter(id => categories[id]);
    const randomCatId = validCats[Math.floor(Math.random() * validCats.length)];
    const category = categories[randomCatId];
    
    if (vigiliaModeEnabled) {
        setGameState('rolling');
        let counter = 0;
        const interval = setInterval(() => {
            setVigiliaRollIndex(prev => (prev + 1) % GAME_MODES.length);
            triggerSound('click');
            counter++;
            if (counter > 15) {
                clearInterval(interval);
                const finalModeIdx = Math.floor(Math.random() * GAME_MODES.length);
                setVigiliaRollIndex(finalModeIdx);
                setTimeout(() => {
                    initializeRound(currentPlayers, category, GAME_MODES[finalModeIdx].id);
                    setVigiliaRounds(prev => prev + 1);
                }, 800);
            }
        }, 100);
    } else {
        const modeId = retryData ? retryData.modeId : GAME_MODES[gameModeIndex].id;
        initializeRound(currentPlayers, category, modeId);
    }
  };

  const initializeRound = (currentPlayers, category, activeModeId) => {
    let activeWords = category.words.filter(w => w.active !== false);
    if (activeWords.length === 0) activeWords = category.words; 

    let wordList = [...activeWords];
    if (activeModeId === 'babel') {
         wordList.sort(() => Math.random() - 0.5);
         while(wordList.length < currentPlayers.length) wordList = [...wordList, ...activeWords];
    }
    const mainWord = wordList[Math.floor(Math.random() * wordList.length)];

    setGeneratedAiHint('');
    setGeneratedAiContext('');
    
    if (aiHintEnabled) {
        setIsGeneratingHint(true);
        const prompt = `Genera una pista CORTA (max 10 palabras), ambigua y sutil sobre el término bíblico "${mainWord.term}" (Categoría: ${category.name}) para ayudar a un impostor.`;
        callGemini(prompt, false).then(text => {
            setGeneratedAiHint(text || "Sin inspiración divina...");
            setIsGeneratingHint(false);
        });
    }

    if (aiContextEnabled) {
         const prompt = `Explica BREVEMENTE (max 20 palabras) qué o quién es "${mainWord.term}" en la Biblia (${category.name}). Para alguien que no lo conoce.`;
         callGemini(prompt, false).then(text => {
            setGeneratedAiContext(text || "Misterio sin resolver...");
         });
    }

    let roles = Array(currentPlayers.length).fill('faithful');
    let impostorsIndices = new Set();
    const targetImpostors = Math.min(impostorCount, currentPlayers.length);
    while (impostorsIndices.size < targetImpostors) impostorsIndices.add(Math.floor(Math.random() * currentPlayers.length));
    impostorsIndices.forEach(index => roles[index] = 'impostor');

    let specialRoleIndices = { judas: -1, etiope: -1, zacarias: -1, sumo: -1, profeta: -1 };
    let faithfulIndices = roles.map((r, i) => r === 'faithful' ? i : -1).filter(i => i !== -1);
    
    if (activeModeId === 'judas' && faithfulIndices.length > 0) specialRoleIndices.judas = faithfulIndices[Math.floor(Math.random() * faithfulIndices.length)];
    if (activeModeId === 'etiope' && faithfulIndices.length > 0) specialRoleIndices.etiope = faithfulIndices[Math.floor(Math.random() * faithfulIndices.length)];
    if (activeModeId === 'profeta' && faithfulIndices.length > 0) specialRoleIndices.profeta = faithfulIndices[Math.floor(Math.random() * faithfulIndices.length)];
    if (activeModeId === 'zacarias') specialRoleIndices.zacarias = Math.floor(Math.random() * currentPlayers.length);
    if (activeModeId === 'sumo') specialRoleIndices.sumo = Math.floor(Math.random() * currentPlayers.length);

    const gamePlayers = currentPlayers.map((p, i) => {
        let assignedWord = mainWord;
        if (activeModeId === 'babel' && roles[i] === 'faithful') assignedWord = wordList[i];
        if (i === specialRoleIndices.etiope) assignedWord = { term: '???', ref: '' };

        return {
            ...p,
            role: roles[i],
            specialRole: 
                i === specialRoleIndices.judas ? 'judas' :
                i === specialRoleIndices.etiope ? 'etiope' :
                i === specialRoleIndices.zacarias ? 'zacarias' :
                i === specialRoleIndices.sumo ? 'sumo' : 
                i === specialRoleIndices.profeta ? 'profeta' : null,
            wordObj: assignedWord, 
            isDead: false
        };
    });

    setGameData({
      players: gamePlayers,
      originalPlayers: currentPlayers,
      categoryName: category.name,
      starterName: gamePlayers.filter(p => p.role !== 'impostor')[Math.floor(Math.random() * (currentPlayers.length - targetImpostors))].name,
      round: 1,
      modeId: activeModeId,
      impostorsIndices: Array.from(impostorsIndices), 
      specialRoleIndices
    });

    setCurrentRevealIndex(0);
    setIsRevealing(false);
    setSelectedVotes([]);
    setGameState('reveal');
  };

  const nextReveal = () => {
    setIsRevealing(false);
    setShowContextModal(false);
    if (currentRevealIndex + 1 >= players.length) setGameState('pre-game');
    else setCurrentRevealIndex(prev => prev + 1);
  };

  const beginDebate = () => {
    if (timerEnabled) setTimeLeft(timerDuration * 60);
    setGameState('playing');
  };

  const updatePartyStats = (winnerRole) => {
      if (!vigiliaModeEnabled) return;
      setPartyStats(prev => {
          const newStats = { ...prev };
          gameData.players.forEach(p => {
              if (!newStats[p.id]) newStats[p.id] = { faithfulWins: 0, impostorWins: 0, ejected: 0 };
              if (p.isDead) newStats[p.id].ejected += 1;
              if (winnerRole === 'faithful' && p.role === 'faithful') newStats[p.id].faithfulWins += 1;
              else if (winnerRole === 'impostor' && p.role === 'impostor') newStats[p.id].impostorWins += 1;
              if (winnerRole === 'impostor' && p.specialRole === 'judas') newStats[p.id].faithfulWins += 1; 
          });
          return newStats;
      });
  };

  // --- VOTING LOGIC ---
  const toggleVote = (playerId) => {
      setSelectedVotes(prev => {
          if (prev.includes(playerId)) return prev.filter(id => id !== playerId);
          
          if (gameFlow === 'sanedrin' && impostorCount > 1) {
              if (prev.length < impostorCount) return [...prev, playerId];
              return prev; 
          }
          return [playerId]; 
      });
      triggerSound('click');
  };

  const confirmVote = () => {
      if (selectedVotes.length === 0) return;

      if (gameFlow === 'sanedrin' && impostorCount > 1) {
          const allImpostors = selectedVotes.every(id => {
              const p = gameData.players.find(pl => pl.id === id);
              return p.role === 'impostor';
          });
          
          if (allImpostors && selectedVotes.length === impostorCount) { 
               updatePartyStats('faithful');
               triggerSound('win-faithful');
               setGameState('result-faithful');
          } else {
               updatePartyStats('impostor');
               triggerSound('win-impostor');
               setGameState('result-impostor');
          }
      } else {
          ejectPlayer(selectedVotes[0]);
      }
      setSelectedVotes([]);
  };

  const ejectPlayer = (playerId) => {
    const player = gameData.players.find(p => p.id === playerId);
    
    // Win Logic
    if (player.role === 'impostor') {
        const remainingImpostors = gameData.players.filter(p => p.id !== playerId && !p.isDead && p.role === 'impostor');
        if (remainingImpostors.length === 0) {
            updatePartyStats('faithful');
            triggerSound('win-faithful');
            setGameState('result-faithful');
            return;
        }
    }

    const updatedPlayers = gameData.players.map(p => p.id === playerId ? { ...p, isDead: true } : p);
    const impostorsAlive = updatedPlayers.filter(p => !p.isDead && p.role === 'impostor').length;
    const faithfulAlive = updatedPlayers.filter(p => !p.isDead && p.role === 'faithful').length;

    if ((impostorsAlive >= faithfulAlive && faithfulAlive > 0) || (faithfulAlive === 0 && impostorsAlive > 0)) {
        updatePartyStats('impostor');
        triggerSound('win-impostor');
        setGameData(prev => ({ ...prev, players: updatedPlayers }));
        setGameState('result-impostor');
        return;
    }

    setGameData(prev => ({ ...prev, players: updatedPlayers, lastEjected: player }));

    if (gameFlow === 'armageddon') setGameState('round-result');
    else {
        // Sanedrin Single Fail
        if (player.role === 'impostor') {
            updatePartyStats('faithful');
            triggerSound('win-faithful');
            setGameState('result-faithful');
        } else {
            updatePartyStats('impostor');
            triggerSound('win-impostor');
            setGameState('result-impostor');
        }
    }
  };

  const continueArmageddon = () => {
      if (timerEnabled) setTimeLeft(timerDuration * 60);
      setGameData(prev => ({...prev, round: prev.round + 1}));
      setGameState('playing');
  };

  useEffect(() => {
    let interval = null;
    if (gameState === 'playing' && timerEnabled && timeLeft > 0) {
      interval = setInterval(() => { setTimeLeft(prev => prev - 1); }, 1000);
    } else if (timeLeft === 0 && gameState === 'playing' && timerEnabled) {
      if (soundEnabled) playSound('alarm');
      if (soundEnabled && vibrationEnabled && navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 800]);
    }
    return () => clearInterval(interval);
  }, [gameState, timeLeft, vibrationEnabled, timerEnabled, soundEnabled]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getActiveMode = () => GAME_MODES.find(m => m.id === (gameData ? gameData.modeId : GAME_MODES[gameModeIndex].id));

  // --- RENDER ---

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-10">
      
      {/* HEADER */}
      <header className="bg-slate-800 border-b border-slate-700 p-3 shadow-lg sticky top-0 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button onClick={handleReset} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <AppIcon />
            <div>
              <h1 className="font-extrabold text-lg leading-none text-white tracking-tight">El Fariseo</h1>
              <span className="text-[10px] text-indigo-300 font-semibold tracking-widest uppercase">Infiltrado</span>
            </div>
          </button>
          <div className="flex gap-2">
            <button onClick={handleOpenBackup} className="p-2 rounded-full hover:bg-slate-600 bg-slate-700 text-slate-200">
                <Save size={18}/>
            </button>
            <button onClick={() => { setMusicEnabled(!musicEnabled); triggerSound('click'); }} className={`p-2 rounded-full hover:bg-slate-600 ${!musicEnabled ? 'text-slate-500 bg-slate-800' : 'bg-slate-700 text-indigo-400'}`}>
                <Music size={18}/>
            </button>
            <button onClick={() => { setSoundEnabled(!soundEnabled); triggerSound('click'); }} className={`p-2 rounded-full hover:bg-slate-600 ${!soundEnabled ? 'text-slate-500 bg-slate-800' : 'bg-slate-700'}`}>
                {soundEnabled ? <Volume2 size={18}/> : <VolumeX size={18}/>}
            </button>
            <button onClick={() => { setInfoTab('instructions'); setShowInfo(true); triggerSound('click'); }} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600"><Info size={18}/></button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 relative z-0">

        {/* --- TOAST --- */}
        {showToast && <Toast message={toastMessage} />}

        {/* --- MODALES --- */}
        <Modal isOpen={!!showResultModal} onClose={() => setShowResultModal(null)} title={showResultModal?.title} triggerSound={triggerSound} zIndex="z-[100]">
            <div className="text-center p-4">
                <div className={`mx-auto mb-4 p-3 rounded-full inline-block ${showResultModal?.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {showResultModal?.type === 'success' ? <CheckCircle size={32}/> : <XCircle size={32}/>}
                </div>
                <p className="text-slate-700 font-medium mb-4">{showResultModal?.msg}</p>
                <Button onClick={() => setShowResultModal(null)} variant={showResultModal?.type === 'success' ? 'primary' : 'danger'}>Entendido</Button>
            </div>
        </Modal>

        <Modal isOpen={showResetStatsConfirm} onClose={() => setShowResetStatsConfirm(false)} title="¿Reiniciar Tabla?" triggerSound={triggerSound} zIndex="z-[100]">
             <div className="space-y-4">
                <div className="flex items-center gap-3 bg-red-50 p-3 rounded-lg border border-red-200">
                    <Trash2 className="text-red-500" size={24} />
                    <p className="text-sm text-slate-700">Se borrarán todas las victorias y estadísticas de Vigilia.</p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={() => setShowResetStatsConfirm(false)} variant="outline">Cancelar</Button>
                    <Button onClick={confirmResetStats} variant="danger">Reiniciar Todo</Button>
                </div>
            </div>
        </Modal>

        {/* Verse Popup */}
        <Modal isOpen={!!showVerseModal} onClose={() => setShowVerseModal(null)} title={showVerseModal?.title} triggerSound={triggerSound} zIndex="z-[100]">
            <div className="text-center p-2">
                <div className="text-slate-700 text-sm italic font-serif leading-relaxed mb-4">
                   <HighlightedText text={showVerseModal?.content} term={showVerseModal?.term} />
                </div>
                <Button onClick={() => setShowVerseModal(null)} variant="primary">Cerrar</Button>
            </div>
        </Modal>

        {/* Backup Modal */}
        <Modal isOpen={showBackupModal} onClose={() => setShowBackupModal(false)} title="Guardar / Cargar" triggerSound={triggerSound} zIndex="z-[100]">
            <div className="space-y-6">
                
                {/* OPCIÓN 1: ARCHIVO */}
                <div className="bg-indigo-50 p-4 rounded-xl border-2 border-indigo-200">
                    <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                        <FileJson size={18}/> Archivo (Recomendado)
                    </h4>
                    <p className="text-xs text-slate-600 mb-3">Descarga tu partida en un archivo seguro para no perder nada.</p>
                    
                    <div className="flex gap-2 mb-3">
                        <Button onClick={downloadBackupFile} variant="primary" className="text-xs py-2">
                            <Download size={16}/> Descargar .SAV
                        </Button>
                    </div>

                    <div className="relative">
                        <input 
                            type="file" 
                            accept=".sav,.json"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="file-upload"
                        />
                        <label 
                            htmlFor="file-upload" 
                            className="w-full flex items-center justify-center gap-2 bg-white border-2 border-dashed border-indigo-300 rounded-lg p-3 cursor-pointer hover:bg-indigo-50 transition-colors text-indigo-600 font-bold text-xs"
                        >
                            <FileUp size={16}/> Seleccionar Archivo para Cargar
                        </label>
                    </div>
                </div>

                {/* OPCIÓN 2: TEXTO */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <ClipboardCopy size={18}/> Código de Texto
                    </h4>
                    <div className="flex items-start gap-2 bg-amber-50 p-2 rounded border border-amber-200 mb-2">
                        <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5"/>
                        <p className="text-[10px] text-amber-700 leading-tight">
                            Este método puede fallar o cortar el texto si tenés mucha información guardada. Usá el archivo si podés.
                        </p>
                    </div>

                    <textarea 
                        className="w-full h-24 bg-white text-slate-600 text-[10px] p-2 rounded border border-slate-300 font-mono mb-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                        value={backupText}
                        onChange={(e) => setBackupText(e.target.value)}
                        placeholder="Pegar código aquí..."
                    />
                    
                    <div className="flex gap-2">
                        <Button onClick={() => { copyToClipboard(backupText); playSound('success'); }} variant="outline" className="py-1 text-xs">
                            <Copy size={14}/> Copiar
                        </Button>
                        <Button onClick={importData} variant="secondary" className="py-1 text-xs">
                           <Upload size={14}/> Cargar Texto
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>

        {/* CATEGORY DETAILS MODAL */}
        <Modal isOpen={!!previewCatId} onClose={() => setPreviewCatId(null)} title="Detalle Categoría" triggerSound={triggerSound}>
           {previewCatId && categories[previewCatId] && (
               <div className="space-y-3">
                   {/* Edit Title for AI Cats */}
                   {previewCatId.startsWith('custom_') && (
                       <div className="flex gap-2 items-center mb-4">
                           {editingCatTitle ? (
                               <>
                                   <input 
                                     type="text" 
                                     value={newCatTitle} 
                                     onChange={(e) => setNewCatTitle(e.target.value)}
                                     className="flex-1 border p-1 rounded text-slate-800"
                                   />
                                   <button onClick={() => saveCatTitle(previewCatId)} className="text-green-600"><CheckSquare/></button>
                               </>
                           ) : (
                               <>
                                   <h3 className="font-bold text-lg text-slate-800 flex-1">{categories[previewCatId].name}</h3>
                                   <button onClick={() => { setNewCatTitle(categories[previewCatId].name); setEditingCatTitle(true); }} className="text-slate-400"><PenLine size={16}/></button>
                               </>
                           )}
                       </div>
                   )}

                   <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                       {categories[previewCatId].words.map((w, i) => (
                           <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100">
                               <div className={`flex-1 ${w.active === false ? 'opacity-40 line-through decoration-slate-400' : ''}`}>
                                   <span className="font-bold text-slate-700 block text-sm">{w.term}</span>
                                   {w.ref && (
                                       <button onClick={() => showVerseContent(w)} className="text-xs text-indigo-500 hover:underline text-left">
                                           {w.ref}
                                       </button>
                                   )}
                               </div>
                               <button onClick={() => toggleWordActive(previewCatId, w.term)} className="text-indigo-600">
                                   {w.active !== false ? <CheckSquare size={18}/> : <Square size={18}/>}
                               </button>
                           </div>
                       ))}
                   </div>
               </div>
           )}
        </Modal>

        <Modal isOpen={showCustomWordsModal} onClose={() => setShowCustomWordsModal(false)} title="Palabras Agregadas" triggerSound={triggerSound}>
            <div className="space-y-2">
                {categories.custom_added && categories.custom_added.words.length > 0 ? (
                    categories.custom_added.words.map((w, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                            <div className="flex flex-col">
                                <span className="text-slate-800 font-bold">{w.term}</span>
                                <span className="text-xs text-slate-500">{w.ref}</span>
                            </div>
                            <button onClick={() => handleDeleteCustomWord(w.term)} className="text-red-500"><Trash2 size={16}/></button>
                        </div>
                    ))
                ) : <p className="text-slate-500 text-center italic">No hay palabras agregadas.</p>}
                {categories.custom_added && (
                    <button onClick={() => { setCategories(prev => { const n = {...prev}; delete n.custom_added; return n; }); }} className="w-full text-red-600 text-xs font-bold mt-4 border border-red-200 p-2 rounded">Eliminar Todas</button>
                )}
            </div>
        </Modal>

        <Modal isOpen={showInfo} onClose={() => setShowInfo(false)} title="Información" triggerSound={triggerSound}>
           <div className="flex space-x-2 border-b border-slate-200 mb-4 pb-1 overflow-x-auto">
               <button onClick={() => setInfoTab('instructions')} className={`px-3 py-2 font-bold text-sm ${infoTab === 'instructions' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>Instrucciones</button>
               <button onClick={() => setInfoTab('credits')} className={`px-3 py-2 font-bold text-sm ${infoTab === 'credits' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>Créditos</button>
           </div>
           
           {infoTab === 'credits' ? (
               <div className="text-center space-y-4">
                  <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex flex-col items-center">
                    <CurlyHairIcon />
                    <p className="font-bold text-xl text-indigo-700">Nicolás Francisco</p>
                    <div className="flex items-center gap-2 mb-2">
                        <a href="https://instagram.com/comunicador.cristiano" target="_blank" rel="noreferrer" className="text-sm text-indigo-500 hover:underline flex items-center justify-center gap-1">
                            @comunicador.cristiano
                        </a>
                        <Instagram size={16} className="text-indigo-500"/>
                    </div>
                    <p className="font-bold text-slate-700 text-sm">CCO Peniel</p>
                  </div>
                  
                  <div className="my-2">
                      <p className="text-xs text-slate-500 mb-2">La donación será destinada al Grupo de Pre, Ados y Jovs de la iglesia y el trabajo ministerial. Cualquier comentario, no duden en contactarme.</p>
                      <a href='https://matecito.co/comunicadorcristiano' rel='noopener noreferrer' target='_blank'>
                          <img 
                              srcSet='https://cdn.matecito.co/assets/images/button_11.png 1x, https://cdn.matecito.co/assets/images/button_11_2x.png 2x, https://cdn.matecito.co/assets/images/button_11_3.75x.png 3.75x' 
                              src='https://cdn.matecito.co/assets/images/button_11.png' 
                              alt='Convidame un Matecito' 
                              className="mx-auto h-10 hover:scale-105 transition-transform"
                          />
                      </a>
                  </div>

                  <p className="text-slate-500 text-sm italic border-l-4 border-amber-400 pl-3 text-left bg-slate-50 p-2 rounded">
                    "Y todo lo que hagáis, hacedlo de corazón, como para el Señor y no para los hombres." - Colosenses 3:23
                  </p>
                  <p className="text-xs text-indigo-400 font-bold flex items-center justify-center gap-2">
                      <Sparkles size={12} /> Anímense a usar la IA para bendecir.
                  </p>
               </div>
           ) : (
               <div className="space-y-4 text-slate-700 text-sm">
                   <div className="bg-slate-50 p-3 rounded-lg border-l-4 border-slate-500">
                       <h4 className="font-bold text-slate-800 mb-1">Objetivo General</h4>
                       <p>El clásico juego del impostor, con temática bíblica. Todos reciben una palabra secreta excepto el <strong>Fariseo</strong>. Hagan preguntas para descubrirlo. ¡A divertirse!</p>
                   </div>
                   
                   <div className="space-y-3">
                       <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1">Flujo del Juego</h4>
                       <div>
                           <strong className="text-indigo-700">Sanedrín</strong>
                           <p className="text-xs">Modo súbito. Una sola votación y termina el juego.</p>
                       </div>
                       <div>
                           <strong className="text-red-700">Armagedón</strong>
                           <p className="text-xs">Si expulsan a un inocente, el juego sigue. Termina al eliminar a todos los fariseos o si estos igualan en número a los fieles.</p>
                       </div>
                       <div>
                           <strong className="text-amber-700">Vigilia</strong>
                           <p className="text-xs">Modo aleatorio que rota entre mecánicas cada ronda y lleva un registro de puntajes.</p>
                       </div>
                       
                       <div className="bg-slate-100 p-2 rounded mt-2 border border-slate-200">
                           <strong className="text-indigo-600 block text-xs mb-1">Guardar configuración</strong>
                           <p className="text-[10px] text-slate-500">Puedes guardar tus categorías, jugadores y puntajes usando el botón de Guardar (disco) en el menú principal.</p>
                       </div>

                       <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1 mt-4">Roles Especiales</h4>
                       <div>
                           <strong className="text-indigo-600">El Profeta</strong>
                           <p className="text-xs">Sabe quiénes son los fariseos, pero NO puede revelarlo ni votarlos directamente. Debe guiar.</p>
                       </div>
                       <div>
                           <strong className="text-indigo-600">Zacarías</strong>
                           <p className="text-xs">Un jugador queda mudo. Solo mímica.</p>
                       </div>
                       <div>
                           <strong className="text-indigo-600">Sumo Sacerdote</strong>
                           <p className="text-xs">Un jugador no juega, solo modera.</p>
                       </div>
                       <div>
                           <strong className="text-indigo-600">Etíope</strong>
                           <p className="text-xs">Fiel que no sabe la palabra. Debe descubrirla sin delatarse.</p>
                       </div>
                   </div>
               </div>
           )}
        </Modal>


        {/* --- PANTALLA 1: SETUP --- */}
        {gameState === 'setup' && (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="pt-2 relative z-0">
               <PhariseeMascot onClick={handleMascotClick} speech={mascotSpeech} />
            </div>
            
            {/* Jugadores */}
            <Card className="relative z-10">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Users className="text-indigo-600" size={18} /> Jugadores
                </h2>
                <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                  <button onClick={() => { handlePlayerCountChange(-1); setGameModeIndex(0); }} className="p-1 text-slate-600 hover:bg-white rounded transition"><UserMinus size={16}/></button>
                  <span className="font-mono font-bold text-lg text-slate-800 w-5 text-center">{players.length}</span>
                  <button onClick={() => handlePlayerCountChange(1)} className="p-1 text-slate-600 hover:bg-white rounded transition"><Users size={16}/></button>
                </div>
              </div>
              <div className="space-y-2 overflow-visible">
                {players.map((p, i) => (
                  <input
                    key={p.id}
                    type="text"
                    value={p.name}
                    onChange={(e) => updateName(p.id, e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                ))}
              </div>
            </Card>

            {/* Configuración de Modos */}
            <Card>
              <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Settings className="text-indigo-600" size={18} /> Reglas de juego
              </h2>

              {/* Game Flow Select */}
              <div className="flex bg-slate-100 p-1 rounded-lg mb-3">
                 <button onClick={() => setGameFlow('sanedrin')} className={`flex-1 py-1 text-xs font-bold rounded-md transition ${gameFlow === 'sanedrin' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'}`}>
                    SANEDRÍN
                 </button>
                 <button onClick={() => setGameFlow('armageddon')} className={`flex-1 py-1 text-xs font-bold rounded-md transition ${gameFlow === 'armageddon' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500'}`}>
                    ARMAGEDÓN
                 </button>
              </div>
              <p className="text-[10px] text-center text-slate-500 mb-4 px-2">
                  {gameFlow === 'sanedrin' 
                    ? "Modo súbito. Una sola votación y termina el juego." 
                    : "Si expulsan a un inocente, el juego sigue. Termina al eliminar a todos los fariseos o si estos igualan en número a los fieles."}
              </p>

              {/* Slider Horizontal (Desactivado en Vigilia) */}
              <div className={`transition-opacity ${vigiliaModeEnabled ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                  <div className="flex gap-3 overflow-x-auto pb-4 snap-x custom-scrollbar">
                      {GAME_MODES.map((mode, idx) => (
                          <button
                            key={mode.id}
                            onClick={() => { setGameModeIndex(idx); triggerSound('click'); }}
                            className={`
                                min-w-[120px] p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all snap-center shrink-0
                                ${gameModeIndex === idx 
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md transform scale-105' 
                                    : 'border-slate-100 bg-slate-50 text-slate-400 grayscale'}
                            `}
                          >
                              {mode.icon}
                              <div className="text-center">
                                  <span className="block text-xs font-bold leading-tight">{mode.label}</span>
                                  <span className="block text-[10px] opacity-70">{mode.sub}</span>
                              </div>
                          </button>
                      ))}
                  </div>
                  {!vigiliaModeEnabled && (
                      <div className="bg-slate-100 p-2 rounded text-center mb-3 border border-slate-200">
                          <p className="text-[10px] text-slate-600 font-medium">{GAME_MODES[gameModeIndex].desc}</p>
                      </div>
                  )}
              </div>

              {/* Vigilia Toggle (Ahora debajo del Slider) */}
              <div className={`flex items-center justify-between p-2 rounded-lg mt-4 mb-3 transition-colors ${vigiliaModeEnabled ? 'bg-amber-100 border border-amber-300' : 'bg-slate-100 border border-slate-200'}`}>
                <div className="flex flex-col">
                    <label className="text-xs text-slate-800 font-black flex items-center gap-2 uppercase tracking-wide">
                        <Flame size={16} className={vigiliaModeEnabled ? 'text-amber-600' : 'text-slate-400'}/> Vigilia
                    </label>
                    <span className="text-[10px] text-slate-500">Modos aleatorios + Ranking</span>
                </div>
                <button onClick={() => { setVigiliaModeEnabled(!vigiliaModeEnabled); triggerSound('click'); }} className={`w-10 h-5 rounded-full relative transition ${vigiliaModeEnabled ? 'bg-amber-500' : 'bg-slate-300'}`}>
                    <div className={`absolute w-3 h-3 bg-white rounded-full top-1 transition-all ${vigiliaModeEnabled ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              {/* Resto de Settings */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                 <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                            Fariseos {impostorCount === players.length && '😜'}
                        </label>
                        <select 
                            value={impostorCount} 
                            onChange={(e) => setImpostorCount(Number(e.target.value))}
                            className="bg-slate-100 rounded px-2 py-2 text-sm font-bold text-slate-800 border-none"
                        >
                        {[...Array(players.length).keys()].map(i => {
                            const val = i + 1;
                            return <option key={val} value={val}>{val}</option>
                        })}
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-bold text-slate-500">Timer</label>
                            <input type="checkbox" checked={timerEnabled} onChange={(e) => setTimerEnabled(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 h-3 w-3" />
                        </div>
                        <select 
                            value={timerDuration} 
                            onChange={(e) => setTimerDuration(Number(e.target.value))}
                            disabled={!timerEnabled}
                            className={`bg-slate-100 rounded px-2 py-2 text-sm font-bold border-none ${!timerEnabled ? 'text-slate-300' : 'text-slate-800'}`}
                        >
                        {[1, 3, 5, 7, 10, 15].map(n => <option key={n} value={n}>{n} min</option>)}
                        </select>
                    </div>
                 </div>

                 {/* Toggles */}
                 <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-100">
                     <div className="flex items-center justify-between">
                        <label className="text-xs text-slate-600 font-medium">Categoría visible al Fariseo</label>
                        <button onClick={() => setShowCategoryToImpostor(!showCategoryToImpostor)} className={`w-10 h-5 rounded-full relative transition ${showCategoryToImpostor ? 'bg-green-500' : 'bg-slate-300'}`}>
                            <div className={`absolute w-3 h-3 bg-white rounded-full top-1 transition-all ${showCategoryToImpostor ? 'left-6' : 'left-1'}`} />
                        </button>
                     </div>
                     <div className="flex items-center justify-between">
                        <label className="text-xs text-slate-600 font-medium flex items-center gap-1">Pista IA para el Fariseo <Sparkles size={12} className="text-amber-500"/></label>
                        <button onClick={() => setAiHintEnabled(!aiHintEnabled)} className={`w-10 h-5 rounded-full relative transition ${aiHintEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                            <div className={`absolute w-3 h-3 bg-white rounded-full top-1 transition-all ${aiHintEnabled ? 'left-6' : 'left-1'}`} />
                        </button>
                     </div>
                     
                     <div className="flex items-center justify-between">
                        <label className="text-xs text-slate-600 font-medium flex items-center gap-1">Pista IA para el Fiel <Sparkles size={12} className="text-amber-500"/></label>
                        <button onClick={() => setAiContextEnabled(!aiContextEnabled)} className={`w-10 h-5 rounded-full relative transition ${aiContextEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                            <div className={`absolute w-3 h-3 bg-white rounded-full top-1 transition-all ${aiContextEnabled ? 'left-6' : 'left-1'}`} />
                        </button>
                     </div>

                     <div className="flex items-center justify-between">
                        <label className={`text-xs font-medium ${timerEnabled ? 'text-slate-600' : 'text-slate-300'}`}>Vibrar y sonar al terminar la ronda</label>
                        <button disabled={!timerEnabled} onClick={() => setVibrationEnabled(!vibrationEnabled)} className={`p-1 rounded ${vibrationEnabled && timerEnabled ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300 bg-slate-100'}`}>
                            {vibrationEnabled ? <Volume2 size={16}/> : <VolumeX size={16}/>}
                        </button>
                     </div>
                 </div>
              </div>
            </Card>

            {/* Categorías */}
            <Card>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <BookOpen className="text-indigo-600" size={18} /> Categorías
                </h2>
                <div className="flex gap-1">
                    <button onClick={() => applyPreset('easy')} className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">FÁCIL</button>
                    <button onClick={() => applyPreset('medium')} className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded hover:bg-amber-200">MEDIO</button>
                    <button onClick={() => applyPreset('hard')} className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">DIFÍCIL</button>
                </div>
              </div>
              
              {/* IA GENERATOR & ADD WORD */}
              <div className="space-y-2 mb-4">
                  <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-100 flex gap-2 items-center">
                      <Sparkles size={14} className="text-indigo-500 ml-1"/>
                      <input 
                        type="text" 
                        value={customTopic}
                        onChange={(e) => setCustomTopic(e.target.value)}
                        placeholder="Generar tema bíblico con IA..."
                        className="flex-1 text-xs bg-transparent focus:outline-none text-indigo-900"
                      />
                      <button onClick={handleGenerateCategory} disabled={isGeneratingCat || !customTopic} className="text-indigo-600 p-1">
                          {isGeneratingCat ? <Loader2 size={16} className="animate-spin"/> : <ChevronRight size={16}/>}
                      </button>
                  </div>
                  <div className="bg-slate-100 p-2 rounded-lg border border-slate-200 flex gap-2 items-center"> {/* Removed relative */}
                      <PlusCircle size={14} className="text-slate-500 ml-1"/>
                      <div className="flex-1 flex gap-2">
                         <input 
                            type="text" 
                            value={customWordInput}
                            onChange={(e) => setCustomWordInput(e.target.value)}
                            placeholder="Palabra..."
                            className="w-1/2 text-xs bg-transparent focus:outline-none text-slate-800"
                         />
                         <input 
                            type="text" 
                            value={customRefInput}
                            onChange={(e) => setCustomRefInput(e.target.value)}
                            placeholder="Ref (opcional)..."
                            className="w-1/2 text-xs bg-transparent focus:outline-none text-slate-500 border-l border-slate-300 pl-2"
                         />
                      </div>
                      <button onClick={handleAddCustomWord} disabled={!customWordInput} className="text-slate-600 p-1 hover:text-green-600">
                          <ChevronRight size={16}/>
                      </button>
                      {/* Divider */}
                      <div className="w-px h-4 bg-slate-300 mx-1"></div>
                      <button onClick={() => setShowCustomWordsModal(true)} className="p-1 text-slate-400 hover:text-slate-600">
                          <Edit3 size={14}/>
                      </button>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {Object.values(categories).map((cat) => {
                  if (cat.id === 'custom_added') return null; // No mostrar custom aquí
                  const isSelected = selectedCats.includes(cat.id);
                  return (
                    <div 
                      key={cat.id}
                      className={`relative rounded-md px-2 py-2 text-xs font-bold transition-all border flex items-center justify-between cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                          : 'bg-slate-50 border-slate-100 text-slate-400'
                      }`}
                    >
                      <span onClick={() => toggleCategory(cat.id)} className="flex-1 truncate">{cat.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); setPreviewCatId(cat.id); triggerSound('click'); }} className="p-1 hover:text-indigo-500 z-10">
                        <Eye size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Button onClick={() => startGame(null)} variant="secondary" className="text-lg animate-pulse shadow-amber-500/20">
              <Play size={20} fill="currentColor" /> COMENZAR MISIÓN
            </Button>
          </div>
        )}

        {/* --- PANTALLA: ROLL ANIMATION --- */}
        {gameState === 'rolling' && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] mt-12">
                <div className="text-4xl animate-spin mb-4">🎲</div>
                <h2 className="text-2xl font-black text-white mb-2">Sorteando Modo...</h2>
                <div className="bg-white p-6 rounded-xl shadow-2xl scale-125 transition-all">
                    <div className="text-indigo-600 mb-2 flex justify-center">{GAME_MODES[vigiliaRollIndex].icon}</div>
                    <h3 className="text-xl font-bold text-slate-800 text-center">{GAME_MODES[vigiliaRollIndex].label}</h3>
                </div>
            </div>
        )}

        {/* --- PANTALLA 2: REVELACIÓN --- */}
        {gameState === 'reveal' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-in slide-in-from-right duration-300">
            <div className="text-center space-y-1">
              <h2 className="text-indigo-300 uppercase tracking-widest text-xs font-bold">Turno de</h2>
              <h1 className="text-3xl font-extrabold text-white">{gameData.players[currentRevealIndex].name}</h1>
            </div>

            <div className="w-full max-w-sm">
              <div className={`relative w-full aspect-[4/5] bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-300`}>
                {!isRevealing ? (
                  <div 
                    onClick={() => { setIsRevealing(true); triggerSound('reveal'); }}
                    className="absolute inset-0 bg-indigo-600 flex flex-col items-center justify-center p-6 text-center cursor-pointer active:bg-indigo-700"
                  >
                    <Eye size={48} className="text-indigo-200 mb-3 animate-bounce" />
                    <h3 className="text-xl font-bold text-white mb-2">Tocá para revelar</h3>
                    <p className="text-indigo-200 text-xs">Mirá que nadie te espíe el celular.</p>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-50">
                    
                    <h3 className="text-slate-400 font-bold uppercase text-xs tracking-wider mb-2">Tu Rol es</h3>
                    
                    {gameData.players[currentRevealIndex].role === 'impostor' ? (
                      <>
                        <div className="text-center mb-4 scale-75">
                             <PhariseeMascot scale={0.8} />
                        </div>
                        <h2 className="text-2xl font-black text-red-600 mb-2">FARISEO</h2>
                        <p className="text-slate-600 text-sm mb-4">Infiltrate. Fingí que sabés de qué hablan.</p>
                        
                        <div className="w-full space-y-2">
                            {showCategoryToImpostor && (
                                <div className="bg-slate-200 px-3 py-2 rounded w-full">
                                    <span className="text-slate-500 text-[10px] font-bold uppercase block">Categoría</span>
                                    <span className="text-slate-800 font-bold text-sm">{gameData.categoryName}</span>
                                </div>
                            )}
                            
                            {aiHintEnabled && (
                                <div className="bg-amber-50 border border-amber-200 px-3 py-2 rounded w-full">
                                    <span className="text-amber-500 text-[10px] font-bold uppercase block flex items-center justify-center gap-1"><Sparkles size={10}/> Pista Divina (IA)</span>
                                    {isGeneratingHint ? (
                                        <div className="flex justify-center p-2"><Loader2 size={16} className="animate-spin text-amber-500"/></div>
                                    ) : (
                                        <p className="text-amber-800 font-bold text-xs italic">"{generatedAiHint}"</p>
                                    )}
                                </div>
                            )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-green-100 p-3 rounded-full mb-3"><BookOpen size={32} className="text-green-600" /></div>
                        
                        {gameData.players[currentRevealIndex].specialRole === 'judas' ? (
                            <h2 className="text-2xl font-black text-amber-600 mb-2">EL JUDAS</h2>
                        ) : gameData.players[currentRevealIndex].specialRole === 'etiope' ? (
                            <h2 className="text-2xl font-black text-purple-600 mb-2">EL ETÍOPE</h2>
                        ) : gameData.players[currentRevealIndex].specialRole === 'profeta' ? (
                            <h2 className="text-2xl font-black text-indigo-600 mb-2">EL PROFETA</h2>
                        ) : (
                            <h2 className="text-2xl font-black text-indigo-600 mb-2">DISCÍPULO</h2>
                        )}

                        {gameData.players[currentRevealIndex].specialRole === 'etiope' ? (
                            <div className="mb-4">
                                <p className="text-slate-600 text-sm">No sabés la palabra, pero debés descubrirla.</p>
                                <p className="text-red-500 font-bold text-xs mt-1 bg-red-50 p-1 rounded">⚠️ No digas que sos Etíope.</p>
                            </div>
                        ) : (
                            <p className="text-slate-600 text-sm mb-4">La palabra es:</p>
                        )}

                        <div className="bg-amber-100 border border-amber-300 px-4 py-3 rounded-lg w-full mb-2">
                          <span className="text-xl font-black text-amber-800 block leading-tight">
                              {gameData.players[currentRevealIndex].wordObj.term}
                          </span>
                          {gameData.players[currentRevealIndex].wordObj.ref && <span className="text-xs text-amber-700 mt-1 block italic">{gameData.players[currentRevealIndex].wordObj.ref}</span>}
                        </div>

                        {/* Faithful Context Hint */}
                        {aiContextEnabled && gameData.players[currentRevealIndex].role === 'faithful' && gameData.players[currentRevealIndex].specialRole !== 'etiope' && (
                             <div className="mt-2 w-full">
                                {showContextModal ? (
                                    <div className="bg-indigo-50 border border-indigo-200 p-2 rounded text-xs text-indigo-800 animate-in fade-in">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold flex items-center gap-1"><Sparkles size={10}/> Contexto:</span>
                                            <button onClick={(e) => { e.stopPropagation(); setShowContextModal(false); }}><X size={14}/></button>
                                        </div>
                                        <p className="mt-1 italic">{generatedAiContext || "Cargando sabiduría..."}</p>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setShowContextModal(true); }}
                                        className="text-[10px] text-indigo-500 underline flex items-center justify-center gap-1 w-full"
                                    >
                                        ¿Qué es esto? <HelpCircle size={10}/>
                                    </button>
                                )}
                             </div>
                        )}
                        
                        {gameData.players[currentRevealIndex].specialRole === 'judas' && (
                            <div className="bg-red-50 border border-red-200 p-2 rounded mt-2">
                                <span className="text-xs text-red-800 block">Fariseos: {gameData.impostorsIndices.map(i => gameData.originalPlayers[i].name).join(', ')}</span>
                            </div>
                        )}
                        {gameData.players[currentRevealIndex].specialRole === 'profeta' && (
                            <div className="bg-indigo-50 border border-indigo-200 p-2 rounded mt-2 text-center">
                                <span className="text-xs text-indigo-800 block font-bold mb-1">Visión Divina:</span>
                                <span className="text-xs text-indigo-800 block">Fariseos: {gameData.impostorsIndices.map(i => gameData.originalPlayers[i].name).join(', ')}</span>
                                <span className="text-[10px] text-red-500 font-bold block mt-1 bg-red-50 p-1 rounded">⚠️ NO PUEDES REVELAR TU ROL</span>
                            </div>
                        )}

                        <div className="bg-slate-100 px-2 py-1 rounded w-full mt-2">
                            <span className="text-slate-400 text-[10px] font-bold uppercase">Categoría: {gameData.categoryName}</span>
                        </div>
                      </>
                    )}

                    <div className="mt-auto w-full pt-4">
                      <Button onClick={nextReveal} variant="primary" className="py-2 text-sm">
                        <EyeOff size={16} /> Entendí, Ocultar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- PANTALLA 2.5: PREVIA --- */}
        {gameState === 'pre-game' && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in zoom-in duration-300 text-center px-6">
                
                {vigiliaModeEnabled && (
                    <div className="mb-4 bg-amber-500 text-white px-4 py-1 rounded-full font-bold text-xs uppercase shadow-lg flex items-center gap-2">
                        <Flame size={12}/> Ronda de Vigilia
                    </div>
                )}

                <HelpCircle size={64} className="text-indigo-400 mb-4" />
                <h2 className="text-3xl font-black text-white mb-2">¿Listos?</h2>
                <div className="mb-6">
                    <span className="text-indigo-300 text-xs font-bold uppercase tracking-widest">Modo Activo</span>
                    <h3 className="text-xl font-bold text-white">{getActiveMode().label}</h3>
                </div>
                
                {gameData.specialRoleIndices.zacarias !== -1 && (
                     <div className="bg-purple-900/50 p-4 rounded-lg mb-4 border border-purple-500 w-full">
                         <h3 className="text-purple-300 font-bold uppercase text-xs">Modo Zacarías</h3>
                         <p className="text-white font-bold text-lg">
                             <MicOff className="inline mr-2" size={18}/>
                             {gameData.players[gameData.specialRoleIndices.zacarias].name} está mudo.
                         </p>
                     </div>
                )}
                {gameData.specialRoleIndices.sumo !== -1 && (
                     <div className="bg-amber-900/50 p-4 rounded-lg mb-4 border border-amber-500 w-full">
                         <h3 className="text-amber-300 font-bold uppercase text-xs">Sumo Sacerdote</h3>
                         <p className="text-white font-bold text-lg">
                             <Crown className="inline mr-2" size={18}/>
                             {gameData.players[gameData.specialRoleIndices.sumo].name} dirige el debate.
                         </p>
                     </div>
                )}

                <div className="text-slate-400 text-sm mb-8 bg-slate-800 p-3 rounded-lg border border-slate-700 w-full">
                    <span className="block text-indigo-400 font-bold text-xs uppercase mb-1">Instrucción</span>
                    {gameData.modeId === 'escribas' ? "Nadie habla. Dibujá una pista relacionada a tu palabra." : 
                     gameData.modeId === 'espadeo' ? "Citá o parafraseá un versículo relacionado a tu palabra." : 
                     "Cada uno tiene que decir una palabra relacionada con lo que le tocó."}
                </div>

                <Button onClick={beginDebate} variant="secondary" className="text-xl py-4">
                    QUE COMIENCE EL ESCUDRIÑO
                </Button>
            </div>
        )}

        {/* --- PANTALLA 3: JUGANDO --- */}
        {gameState === 'playing' && (
          <div className="space-y-6 animate-in fade-in duration-500 mt-4">
            
            <div className="text-center relative">
               {timerEnabled ? (
                    <div className="inline-flex flex-col items-center justify-center w-40 h-40 rounded-full border-4 border-slate-700 bg-slate-800 shadow-inner mb-4">
                        <div className={`text-5xl font-black tabular-nums tracking-tighter ${timeLeft < 30 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                            {formatTime(timeLeft)}
                        </div>
                        <span className="text-xs text-slate-500 uppercase font-bold mt-1">Tiempo Restante</span>
                    </div>
               ) : (
                   <div className="mb-8">
                       <Clock size={48} className="mx-auto text-slate-600 mb-2"/>
                       <span className="text-slate-400 font-bold">Tiempo Libre</span>
                   </div>
               )}

               <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 mx-4">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider block mb-1">La ronda comienza con</span>
                <span className="text-xl font-bold text-amber-400">{gameData.starterName}</span>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-4 mx-2 text-center border border-slate-700">
               {showCategoryToImpostor ? (
                  <>
                    <h3 className="text-slate-500 text-xs uppercase font-bold mb-1">Categoría</h3>
                    <p className="text-xl font-bold text-white">{gameData.categoryName}</p>
                  </>
               ) : (
                   <p className="text-slate-500 text-sm italic">Categoría oculta para evitar soplos</p>
               )}
            </div>

            <div className="space-y-2 px-4 relative">
                <div className="w-full">
                    <Button onClick={() => setGameState('vote')} variant="danger" className="py-4 text-lg shadow-lg shadow-red-900/50">
                        <Gavel size={24} /> {timeLeft === 0 && timerEnabled ? '¡TIEMPO! A VOTAR' : 'VOTAR AHORA'}
                    </Button>
                </div>
                <p className="text-center text-slate-500 text-[10px]">
                    Presioná cuando {timerEnabled ? 'el tiempo acabe o ' : ''}crean haber encontrado al infiltrado.
                </p>
            </div>
          </div>
        )}

        {/* --- PANTALLA 4: VOTACIÓN --- */}
        {gameState === 'vote' && (
             <div className="animate-in slide-in-from-bottom duration-300 pt-4">
                 <h2 className="text-center text-2xl font-bold text-white mb-2">¿Quién es el Fariseo?</h2>
                 <p className="text-center text-slate-400 text-sm mb-6">
                     {gameData.modeId === 'normal' && impostorCount > 1 ? "Seleccioná a los sospechosos y confirma." : "Tocá al sospechoso para expulsarlo."}
                 </p>
                 
                 <div className="grid gap-3 max-h-[60vh] overflow-y-auto pb-20">
                     {gameData.players.map(p => {
                         if (p.isDead) return null;
                         const isSelected = selectedVotes.includes(p.id);
                         return (
                             <button 
                                key={p.id}
                                onClick={() => {
                                    if (gameFlow === 'sanedrin' && impostorCount > 1) {
                                        toggleVote(p.id);
                                    } else {
                                        ejectPlayer(p.id);
                                    }
                                }}
                                className={`
                                    border p-4 rounded-xl flex items-center justify-between group transition-all
                                    ${isSelected 
                                        ? 'bg-red-900/40 border-red-500 ring-2 ring-red-500' 
                                        : 'bg-slate-800 border-slate-600 hover:bg-slate-700'}
                                `}
                             >
                                 <span className="font-bold text-lg">{p.name}</span>
                                 <div className={`p-2 rounded-full transition-colors ${isSelected ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                     {isSelected ? <CheckCircle size={20}/> : <Gavel size={20}/>}
                                 </div>
                             </button>
                         )
                     })}
                 </div>

                 {/* Confirm Button for Multi-Select */}
                 {gameFlow === 'sanedrin' && impostorCount > 1 && (
                     <div className="fixed bottom-6 left-6 right-6">
                         <Button 
                            onClick={confirmVote} 
                            disabled={selectedVotes.length !== impostorCount}
                            variant={selectedVotes.length === impostorCount ? 'danger' : 'outline'}
                            className="shadow-xl"
                         >
                            Confirmar Votos ({selectedVotes.length}/{impostorCount})
                         </Button>
                     </div>
                 )}

                 <div className="mt-6 mb-20">
                    <Button onClick={() => setGameState('playing')} variant="outline" className="bg-transparent border-slate-600 text-slate-400">
                        Cancelar, seguir debatiendo
                    </Button>
                 </div>
             </div>
        )}

        {/* --- PANTALLA 5: RESULTADO RONDA (ARMAGEDÓN) --- */}
        {gameState === 'round-result' && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in zoom-in duration-300 px-4">
                 <div className="mb-6">
                    {gameData.lastEjected.role === 'faithful' ? (
                        <div className="text-green-500 bg-green-500/10 p-4 rounded-full inline-block mb-4"><UserMinus size={48}/></div>
                    ) : (
                        <div className="text-red-500 bg-red-500/10 p-4 rounded-full inline-block mb-4">
                             <PhariseeMascot scale={0.5} />
                        </div>
                    )}
                    <h2 className="text-3xl font-bold text-white mb-2">{gameData.lastEjected.name}</h2>
                    <p className="text-xl text-slate-300">
                        era <span className={gameData.lastEjected.role === 'faithful' ? 'text-green-400 font-bold' : 'text-red-500 font-bold'}>
                            {gameData.lastEjected.role === 'faithful' ? 'un Discípulo Fiel' : 'el Fariseo'}
                        </span>
                    </p>
                 </div>
                 
                 <p className="text-slate-400 mb-8 bg-slate-800 p-3 rounded text-sm">
                     {gameData.lastEjected.role === 'faithful' 
                        ? "¡Echaron a un inocente! El Fariseo sigue entre nosotros..." 
                        : "¡Lo atraparon! Pero... ¿quedan más?"}
                 </p>

                 <Button onClick={continueArmageddon} variant="primary">
                     <ChevronRight size={20} /> Siguiente Ronda
                 </Button>
            </div>
        )}

        {/* --- PANTALLA 6: RESULTADO FINAL --- */}
        {(gameState === 'result-faithful' || gameState === 'result-impostor') && (
          <div className="space-y-6 animate-in zoom-in duration-300 pt-6">
             
             {gameState === 'result-faithful' ? (
                 <div className="text-center">
                     <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 mb-2">¡VICTORIA!</h2>
                     <p className="text-white font-medium">El rebaño está a salvo.</p>
                 </div>
             ) : (
                 <div className="text-center">
                     <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-600 mb-2">¡AY DE VOSOTROS!</h2>
                     <p className="text-white font-medium">Los Fariseos ganaron.</p>
                 </div>
             )}

             <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center relative overflow-hidden">
                <div className="relative z-10">
                    <h3 className="text-indigo-300 text-xs uppercase tracking-widest font-bold mb-2">La palabra era</h3>
                    <div className="bg-slate-900 rounded-lg py-3 px-4 mb-4 inline-block">
                        <span className="text-2xl font-black text-white block">
                            {gameData.modeId === 'babel' ? '¡Eran distintas!' : gameData.players[0].wordObj.term}
                        </span>
                    </div>

                    <div className="space-y-2 text-left">
                        <h3 className="text-slate-500 text-xs uppercase font-bold border-b border-slate-700 pb-1">Roles Revelados</h3>
                        <div className="max-h-48 overflow-y-auto">
                            {gameData.players.map(p => (
                                <div key={p.id} className={`flex justify-between items-center text-sm p-2 rounded ${p.role === 'impostor' ? 'bg-red-500/10 text-red-200' : 'text-slate-300'}`}>
                                    <span className={p.isDead ? 'line-through opacity-50' : ''}>{p.name}</span>
                                    <span className="font-bold text-xs uppercase flex items-center gap-1">
                                        {p.role === 'impostor' ? 'Fariseo' : 'Fiel'}
                                        {p.specialRole === 'judas' && ' (Judas)'}
                                        {p.specialRole === 'etiope' && ' (Etíope)'}
                                        {p.specialRole === 'profeta' && ' (Profeta)'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
             </div>

             {/* VIGILIA STATS */}
             {vigiliaModeEnabled && Object.keys(partyStats).length > 0 && (
                 <div className="bg-amber-100 rounded-xl p-4 border-2 border-amber-300 mt-4 shadow-lg animate-in slide-in-from-bottom">
                     <div className="flex items-center justify-center gap-2 mb-3 border-b border-amber-200 pb-2">
                         <Trophy size={20} className="text-amber-600" />
                         <h3 className="font-black text-amber-800 uppercase tracking-widest text-sm">Tabla Vigilia</h3>
                         <div className="ml-auto bg-amber-200 px-2 py-1 rounded text-[10px] font-bold text-amber-800">
                             Rondas: {vigiliaRounds}
                         </div>
                         <button onClick={() => setShowResetStatsConfirm(true)} className="text-[10px] text-red-600 bg-red-100 px-2 py-1 rounded hover:bg-red-200 border border-red-200 flex items-center gap-1"><RefreshCw size={10}/> Reset</button>
                     </div>
                     <div className="overflow-x-auto">
                         <table className="w-full text-xs text-left">
                             <thead>
                                 <tr className="text-amber-700 border-b border-amber-200">
                                     <th className="pb-1 pl-1">Jugador</th>
                                     <th className="pb-1 text-center">Victorias</th>
                                     <th className="pb-1 text-center">Engaños</th>
                                     <th className="pb-1 text-center">Martirios</th>
                                 </tr>
                             </thead>
                             <tbody className="text-amber-900 font-bold">
                                 {players.map(p => {
                                     const stats = partyStats[p.id] || { faithfulWins: 0, impostorWins: 0, ejected: 0 };
                                     return (
                                         <tr key={p.id} className="border-b border-amber-200/50 last:border-none">
                                             <td className="py-1 pl-1">{p.name}</td>
                                             <td className="py-1 text-center text-green-700">{stats.faithfulWins}</td>
                                             <td className="py-1 text-center text-red-600">{stats.impostorWins}</td>
                                             <td className="py-1 text-center text-slate-500">{stats.ejected}</td>
                                         </tr>
                                     );
                                 })}
                             </tbody>
                         </table>
                     </div>
                 </div>
             )}

             <div className="grid grid-cols-2 gap-3 pt-4">
               <Button onClick={() => startGame(null)} variant="primary">
                 ¡Otra Ronda!
               </Button>
               <Button onClick={handleReset} variant="outline" className="bg-transparent text-slate-200 border-slate-500 hover:bg-slate-800 hover:text-white">
                 Cambiar ajustes
               </Button>
             </div>
          </div>
        )}

      </main>
    </div>
  );

}


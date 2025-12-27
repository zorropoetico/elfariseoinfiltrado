import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Users, UserMinus, Play, Eye, EyeOff,
    Settings, BookOpen, Info, Volume2, VolumeX,
    HelpCircle, ChevronRight, Gavel, X, Clock, ExternalLink,
    Crown, MicOff, Edit3, ScrollText, Sword, ChevronLeft, Music,
    Sparkles, Trophy, AlertTriangle, Flame, PlusCircle, Trash2, Save, Upload, RefreshCw, LogOut, Loader2, CheckSquare, Square, PenLine, ClipboardCopy, CheckCircle, XCircle, Copy, Download, Instagram, FileJson, FileUp
} from 'lucide-react';

// --- CONFIGURACIÓN GEMINI API ---
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

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
                g.gain.linearRampToValueAtTime(0.1, now + 0.1 + (i * 0.05));
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
                    bgOscillators.forEach(osc => { try { osc.stop(); } catch (e) { } });
                    bgOscillators = [];
                }, 1000);
            }
        }
    } catch (e) { console.error(e); }
};

// --- DATA: Modos de Juego ---
const GAME_MODES = [
    { id: 'normal', label: 'Clásico', sub: '(Estándar)', icon: <Users size={20} />, desc: 'Ronda de preguntas y momento de debate.' },
    { id: 'profeta', label: 'El Profeta', sub: '(Vidente)', icon: <Eye size={20} />, desc: 'Un fiel conoce a los Fariseos, pero NO puede revelar su rol ni votarlos directamente.' },
    { id: 'espadeo', label: 'Espadeo', sub: '(Citas)', icon: <Sword size={20} />, desc: 'En lugar de decir una palabra, debés citar o parafrasear un versículo relacionado.' },
    { id: 'escribas', label: 'Escribas', sub: '(Dibujo)', icon: <Edit3 size={20} />, desc: 'Nadie habla. Dibujan una pista en papel y la pasan al siguiente.' },
    { id: 'zacarias', label: 'Zacarías', sub: '(Mudo)', icon: <MicOff size={20} />, desc: 'Un jugador al azar queda mudo. Solo puede hacer mímica. ¡Suerte si es Fariseo!' },
    { id: 'sumo', label: 'Sumo Sacerdote', sub: '(Juez)', icon: <Crown size={20} />, desc: 'Un jugador dirige el debate desde el centro como moderador.' },
    { id: 'judas', label: 'El Judas', sub: '(Traidor)', icon: <ScrollText size={20} />, desc: 'Un fiel sabe quién es el Fariseo. Si el Fariseo gana, Judas también gana.' },
    { id: 'babel', label: 'Babel', sub: '(Caos)', icon: <HelpCircle size={20} />, desc: 'Cada fiel recibe una palabra distinta (pero de la misma categoría).' },
    { id: 'etiope', label: 'Etíope', sub: '(Confuso)', icon: <HelpCircle size={20} />, desc: 'Un fiel no sabe la palabra, pero no es impostor. No puede revelar su rol.' }
];

// --- DATA: Categorías Completas ---
const createWord = (term, ref, content, clue, active = true) => ({ term, ref, content, clue, active });

const BASE_CATEGORIES = {
    libros: {
        id: 'libros', name: 'Libros Biblia', level: 'easy', words: [
            createWord('Génesis', 'Génesis 1:1', 'En el principio creó Dios los cielos y la tierra.', 'El comienzo de la historia.'),
            createWord('Salmos', 'Salmos 23:1', 'El Señor es mi pastor, nada me faltará.', 'Cánticos y poesías para el alma.'),
            createWord('Mateo', 'Mateo 1:1', 'Libro de la genealogía de Jesucristo.', 'El primer evangelio, escrito por un recaudador.'),
            createWord('Apocalipsis', 'Apocalipsis 1:1', 'La revelación de Jesucristo.', 'El libro del fin de los tiempos.'),
            createWord('Éxodo', 'Éxodo 20:1', 'Y habló Dios todas estas palabras.', 'Salida de la esclavitud.'),
            createWord('Proverbios', 'Proverbios 1:7', 'El temor del Señor es el principio de la sabiduría.', 'Consejos sabios para la vida.'),
            createWord('Hechos', 'Hechos 1:8', 'Pero recibiréis poder...', 'Historia de la iglesia primitiva.'),
            createWord('Romanos', 'Romanos 1:16', 'No me avergüenzo del evangelio.', 'Carta doctrinal de Pablo a la capital.'),
            createWord('Jonás', 'Jonás 1:17', 'Y el Señor dispuso un gran pez.', 'Un profeta rebelde y un gran pez.'),
            createWord('Daniel', 'Daniel 6:22', 'Mi Dios envió su ángel.', 'Foso de leones y sueños.'),
            createWord('Isaías', 'Isaías 9:6', 'Porque un niño nos ha nacido.', 'El profeta mesiánico por excelencia.'),
            createWord('Lucas', 'Lucas 19:10', 'El Hijo del Hombre vino a buscar...', 'Evangelio detallado, escrito por un médico.'),
            createWord('Juan', 'Juan 3:16', 'Porque de tal manera amó Dios al mundo.', 'El discípulo amado cuenta su historia.'),
            createWord('1 Corintios', '1 Cor. 13:13', 'El amor nunca deja.', 'Carta a una iglesia con muchos problemas.'),
            createWord('Efesios', 'Efesios 2:8', 'Por gracia sois salvos.', 'La armadura de Dios está aquí.'),
            createWord('Levítico', 'Levítico 19:18', 'Amarás a tu prójimo...', 'Leyes, sacrificios y santidad.'),
            createWord('Deuteronomio', 'Deut. 6:4', 'Oye, Israel: Jehová nuestro Dios...', 'Segunda ley, recordando el pacto.'),
            createWord('Josué', 'Josué 1:9', 'Esfuérzate y sé valiente.', 'Conquista de la Tierra Prometida.'),
            createWord('Jueces', 'Jueces 21:25', 'Cada uno hacía lo que le parecía.', 'Líderes militares y ciclos de pecado.'),
            createWord('Rut', 'Rut 1:16', 'Tu pueblo será mi pueblo.', 'Historia de redención en los campos de cebada.'),
            createWord('Eclesiastés', 'Ecl. 3:1', 'Todo tiene su tiempo.', 'Vanidad de vanidades, todo es vanidad.'),
            createWord('Cantares', 'Cant. 2:16', 'Mi amado es mío.', 'Poema de amor y pasión.'),
            createWord('Jeremías', 'Jer. 29:11', 'Planes de bienestar.', 'El profeta llorón.'),
            createWord('Ezequiel', 'Eze. 37:4', 'Huesos secos, oíd palabra de Jehová.', 'Visiones extrañas y ruedas de fuego.')
        ]
    },
    oficios: {
        id: 'oficios', name: 'Oficios', level: 'easy', words: [
            createWord('Pastor', 'Salmos 23:1', 'El Señor es mi pastor.', 'Cuida del rebaño.'),
            createWord('Pescador', 'Mateo 4:19', 'Os haré pescadores de hombres.', 'Trabaja en el mar o lago.'),
            createWord('Carpintero', 'Marcos 6:3', '¿No es este el carpintero?', 'Trabaja con madera, como Jesús.'),
            createWord('Rey', '1 Samuel 8:5', 'Constitúyenos un rey.', 'Gobierna con corona.'),
            createWord('Sacerdote', 'Hebreos 4:14', 'Gran sumo sacerdote.', 'Intercede ante Dios por el pueblo.'),
            createWord('Profeta', 'Deut. 18:18', 'Un profeta levantaré.', 'Habla de parte de Dios.'),
            createWord('Soldado', '2 Tim. 2:3', 'Buen soldado de Jesucristo.', 'Lucha en batallas.'),
            createWord('Sembrador', 'Mateo 13:3', 'El sembrador salió a sembrar.', 'Planta semillas en la tierra.'),
            createWord('Recaudador', 'Lucas 5:27', 'Leví sentado en la oficina.', 'Cobra impuestos, mal visto.'),
            createWord('Fariseo', 'Lucas 18:11', 'El fariseo oraba consigo mismo.', 'Religioso estricto y legalista.'),
            createWord('Escriba', 'Esdras 7:6', 'Escriba diligente.', 'Experto en copiar la ley.'),
            createWord('Centurión', 'Mateo 8:5', 'Hombre bajo autoridad.', 'Oficial romano al mando de 100.'),
            createWord('Juez', 'Jueces 2:16', 'Jehová levantó jueces.', 'Líder que impartía justicia antes de los reyes.'),
            createWord('Copero', 'Nehemías 1:11', 'Yo era copero del rey.', 'Sirve vino al rey y prueba la bebida.'),
            createWord('Panadero', 'Génesis 40:1', 'El panadero del rey.', 'Hace pan y hornea.'),
            createWord('Alfarero', 'Jeremías 18:6', 'Barro en manos del alfarero.', 'Moldea barro para hacer vasijas.'),
            createWord('Médico', 'Colosenses 4:14', 'Lucas, el médico amado.', 'Cura a los enfermos.'),
            createWord('Tiendero', 'Hechos 18:3', 'Oficio de hacer tiendas.', 'Fabrica carpas, como Pablo.')
        ]
    },
    animales: {
        id: 'animales', name: 'Animales', level: 'easy', words: [
            createWord('Oveja', 'Isaías 53:7', 'Como oveja fue llevado al matadero.', 'Animal que necesita pastor.'),
            createWord('León', '1 Pedro 5:8', 'León rugiente.', 'Rey de la selva, peligroso.'),
            createWord('Serpiente', 'Génesis 3:1', 'Más astuta que todos.', 'Engañó a Eva en el huerto.'),
            createWord('Paloma', 'Mateo 3:16', 'Descendía como paloma.', 'Símbolo de paz y del Espíritu.'),
            createWord('Burro', 'Números 22:28', 'Habló a Balaam.', 'Animal de carga, habló una vez.'),
            createWord('Pez', 'Jonás 1:17', 'Un gran pez.', 'Tragó a un profeta.'),
            createWord('Camello', 'Mateo 19:24', 'Ojo de una aguja.', 'Animal del desierto con joroa.'),
            createWord('Lobo', 'Mateo 7:15', 'Lobos rapaces.', 'Enemigo de las ovejas.'),
            createWord('Águila', 'Isaías 40:31', 'Alas como de águila.', 'Vuela alto y renueva sus fuerzas.'),
            createWord('Oso', '2 Reyes 2:24', 'Salieron dos osas.', 'Animal fuerte del bosque.'),
            createWord('Cuervo', '1 Reyes 17:4', 'Los cuervos te sustenten.', 'Ave negra que alimentó a Elías.'),
            createWord('Cabra', 'Mateo 25:32', 'Ovejas de los cabritos.', 'Animal similar a la oveja, pero más terco.'),
            createWord('Langosta', 'Marcos 1:6', 'Comía langostas.', 'Plaga de Egipto y comida de Juan.'),
            createWord('Rana', 'Éxodo 8:2', 'Plaga de ranas.', 'Animal anfibio que croa.'),
            createWord('Escorpión', 'Lucas 10:19', 'Serpientes y escorpiones.', 'Arácnido con aguijón venenoso.'),
            createWord('Zorra', 'Lucas 13:32', 'Decidle a ese zorro.', 'Animal astuto, Jesús llamó así a Herodes.'),
            createWord('Mula', 'Salmos 32:9', 'Como el mulo sin entendimiento.', 'Híbrido de carga.'),
            createWord('Hormiga', 'Proverbios 6:6', 'Mira la hormiga.', 'Trabajadora incansable.'),
            createWord('Perro', 'Proverbios 26:11', 'Perro que vuelve al vómito.', 'Fiel amigo o animal impuro.'),
            createWord('Ballena', 'Mateo 12:40', 'Vientre del gran pez (ballena).', 'Mamífero marino gigante.')
        ]
    },
    objetos: {
        id: 'objetos', name: 'Objetos', level: 'easy', words: [
            createWord('Arca del Pacto', 'Éxodo 25:10', 'Arca de madera de acacia.', 'Caja dorada muy sagrada.'),
            createWord('Cruz', 'Hebreos 12:2', 'Soportó la cruz.', 'Instrumento de ejecución romana.'),
            createWord('Copa', 'Lucas 22:20', 'Esta copa es el nuevo pacto.', 'Recipiente para beber vino.'),
            createWord('Túnica', 'Génesis 37:3', 'Túnica de colores.', 'Prenda de vestir larga y sin costuras.'),
            createWord('Corona', 'Apocalipsis 2:10', 'Corona de la vida.', 'Símbolo de realeza en la cabeza.'),
            createWord('Red', 'Lucas 5:4', 'Echad vuestras redes.', 'Herramienta de pescador.'),
            createWord('Lámpara', 'Salmos 119:105', 'Lámpara es a mis pies.', 'Da luz en la oscuridad.'),
            createWord('Piedra', '1 Samuel 17:49', 'Una piedra y la honda.', 'Roca pequeña o angular.'),
            createWord('Vara', 'Números 17:8', 'La vara de Aarón.', 'Palo de madera usado por pastores.'),
            createWord('Tablas Ley', 'Éxodo 31:18', 'Tablas de piedra.', 'Donde se escribieron los mandamientos.'),
            createWord('Menorá', 'Éxodo 25:31', 'Candelabro de oro.', 'Candelabro de siete brazos.'),
            createWord('Honda', '1 Samuel 17:40', 'Honda en su mano.', 'Arma para lanzar piedras.'),
            createWord('Manto', '2 Reyes 2:13', 'Manto de Elías.', 'Capa exterior de ropa.'),
            createWord('Trompeta', 'Josué 6:5', 'Sonido de bocina.', 'Instrumento de viento para anunciar.'),
            createWord('Arpa', '1 Samuel 16:23', 'David tomaba el arpa.', 'Instrumento de cuerdas.'),
            createWord('Altar', 'Génesis 8:20', 'Edificó un altar.', 'Mesa para sacrificios.'),
            createWord('Incienso', 'Salmos 141:2', 'Como incienso delante de ti.', 'Aroma agradable al quemarse.'),
            createWord('Aceite', 'Santiago 5:14', 'Ungiéndole con aceite.', 'Líquido para ungir o cocinar.'),
            createWord('Pan', 'Juan 6:35', 'Pan de vida.', 'Alimento básico de harina.'),
            createWord('Espada', 'Hebreos 4:12', 'Más cortante que espada.', 'Arma de filo para la guerra.')
        ]
    },
    vida_jesus: {
        id: 'vida_jesus', name: 'Vida de Jesús', level: 'easy', words: [
            createWord('Jesús', 'Mateo 1:21', 'Salvará a su pueblo.', 'El Salvador del mundo.'),
            createWord('Pesebre', 'Lucas 2:7', 'Le acostó en un pesebre.', 'Cama para animales, primer cuna.'),
            createWord('Bautismo', 'Marcos 1:9', 'Bautizado en el Jordán.', 'Sumergirse en agua.'),
            createWord('Tentación', 'Mateo 4:1', 'Tentado en el desierto.', 'Prueba del diablo.'),
            createWord('Transfiguración', 'Mateo 17:2', 'Se transfiguró.', 'Cambio de apariencia glorioso.'),
            createWord('Última Cena', 'Lucas 22:15', 'Comer esta Pascua.', 'Comida final con los 12.'),
            createWord('Crucifixión', 'Juan 19:18', 'Le crucificaron.', 'Muerte en madero.'),
            createWord('Resurrección', 'Lucas 24:6', 'Ha resucitado.', 'Volver a la vida.'),
            createWord('Ascensión', 'Hechos 1:9', 'Fue alzado.', 'Subir al cielo.'),
            createWord('Pedro', 'Mateo 16:18', 'Sobre esta roca.', 'Pescador impulsivo, negó 3 veces.'),
            createWord('Juan', 'Juan 13:23', 'El que Jesús amaba.', 'El discípulo amado.'),
            createWord('Jacobo', 'Mateo 4:21', 'Hijo de Zebedeo.', 'Hermano de Juan, primer mártir.'),
            createWord('Andrés', 'Juan 1:40', 'Hermano de Simón.', 'Trajo a Pedro a Jesús.'),
            createWord('Felipe', 'Juan 1:43', 'Halló a Felipe.', 'De Betsaida, como Pedro.'),
            createWord('Bartolomé', 'Mateo 10:3', 'Felipe y Bartolomé.', 'Probablemente Natanael.'),
            createWord('Mateo', 'Mateo 9:9', 'Llamado Leví.', 'Recaudador que siguió a Jesús.'),
            createWord('Tomás', 'Juan 20:27', 'Pon aquí tu dedo.', 'Dudó hasta ver.'),
            createWord('Santiago Alfeo', 'Marcos 3:18', 'Hijo de Alfeo.', 'El otro Jacobo.'),
            createWord('Tadeo', 'Mateo 10:3', 'Lebeo por sobrenombre.', 'Judas no el Iscariote.'),
            createWord('Simón Zelote', 'Lucas 6:15', 'Llamado Zelote.', 'Pertenecía a un grupo rebelde.'),
            createWord('Judas Iscariote', 'Lucas 22:48', 'Con un beso entregas.', 'El traidor.'),
            createWord('Lázaro', 'Juan 11:43', '¡Ven fuera!', 'Resucitó tras 4 días.'),
            createWord('Marta', 'Lucas 10:41', 'Afanada y turbada.', 'Hermana trabajadora de Lázaro.'),
            createWord('María', 'Lucas 10:42', 'La buena parte.', 'Hermana adoradora de Lázaro.'),
            createWord('Zaqueo', 'Lucas 19:5', 'Baja del árbol.', 'Cobrador bajito que subió al sicómoro.'),
            createWord('Nicodemo', 'Juan 3:4', 'Maestro de Israel.', 'Vino a Jesús de noche.'),
            createWord('Pilato', 'Mateo 27:24', 'Se lavó las manos.', 'Gobernador romano que lo condenó.'),
            createWord('Caifás', 'Juan 11:49', 'Sumo Sacerdote.', 'Líder religioso que conspiró.'),
            createWord('Barrabás', 'Marcos 15:15', 'Les soltó a Barrabás.', 'Criminal liberado en lugar de Jesús.'),
            createWord('Centurión', 'Marcos 15:39', 'Hijo de Dios.', 'Soldado al pie de la cruz.'),
            createWord('Samaritana', 'Juan 4:7', 'Mujer de Samaria.', 'Jesús le pidió agua en el pozo.'),
            createWord('José Arimatea', 'Marcos 15:43', 'Pidió el cuerpo.', 'Prestó su tumba nueva.'),
            createWord('Simón Cirene', 'Lucas 23:26', 'Cargó la cruz.', 'Ayudó a Jesús con el madero.')
        ]
    },
    profetas: {
        id: 'profetas', name: 'Profetas', level: 'medium', words: [
            createWord('Moisés', 'Deut 34', 'Libertador.', 'Sacó a Israel de Egipto.'),
            createWord('Elías', '2 Rey 2', 'Carro de fuego.', 'Profeta de fuego, no murió.'),
            createWord('Isaías', 'Isa 6', 'Santo, santo, santo.', 'Profeta de la corte, mesiánico.'),
            createWord('Jeremías', 'Jer 1', 'No digas soy niño.', 'Profeta llorón.'),
            createWord('Jonás', 'Jon 1', 'Huye a Tarsis.', 'Tragado por un pez.'),
            createWord('Daniel', 'Dan 6', 'Foso de leones.', 'Interpretó sueños en Babilonia.'),
            createWord('Samuel', '1 Sam 3', 'Habla que tu siervo oye.', 'Ungió a David y Saúl.'),
            createWord('Juan Bautista', 'Mat 3', 'Voz en el desierto.', 'Precursor de Jesús, vestía piel.'),
            createWord('David', 'Salmos', 'Dulce cantor.', 'Rey pastor y salmista.'),
            createWord('Noé', 'Gen 6', 'Arca.', 'Construyó un barco gigante.'),
            createWord('Eliseo', '2 Rey 2', 'Doble porción.', 'Sucesor de Elías, calvo.'),
            createWord('Ezequiel', 'Eze 1', 'Ruedas.', 'Vio el valle de huesos secos.'),
            createWord('Oseas', 'Os 1', 'Cásate con ramera.', 'Profeta del amor fiel de Dios.'),
            createWord('Joel', 'Joel 1', 'Plaga de langostas.', 'Profetizó sobre el Espíritu Santo.'),
            createWord('Amós', 'Am 1', 'Pastor de Tecoa.', 'Profeta de la justicia social.'),
            createWord('Abdías', 'Abd 1', 'Contra Edom.', 'Libro más corto del AT.'),
            createWord('Miqueas', 'Miq 1', 'Belén Efrata.', 'Profetizó lugar nacimiento Mesías.'),
            createWord('Nahúm', 'Nah 1', 'Contra Nínive.', 'Profecía sobre la caída de Nínive.'),
            createWord('Habacuc', 'Hab 1', 'Justo por fe vivirá.', 'Cuestionó a Dios desde la torre.'),
            createWord('Sofonías', 'Sof 1', 'Día de Jehová.', 'Profecía del día del juicio.'),
            createWord('Hageo', 'Hag 1', 'Reedificad la casa.', 'Animó a reconstruir el templo.'),
            createWord('Zacarías', 'Zac 1', 'No con fuerza.', 'Profeta de visiones y reconstrucción.'),
            createWord('Malaquías', 'Mal 1', 'El mensajero.', 'Último profeta del AT.'),
            createWord('Natán', '2 Sam 12', 'Tú eres aquel hombre.', 'Confrontó a David.'),
            createWord('Gad', '1 Sam 22', 'Vidente de David.', 'Ofreció tres castigos a David.'),
            createWord('Balaam', 'Num 22', 'Asna habló.', 'Profeta mercenario, su burra le habló.'),
            createWord('Débora', 'Jue 4', 'Jueza y profetisa.', 'Madre en Israel, bajo la palmera.'),
            createWord('Ana', 'Luc 2', 'Profetisa en templo.', 'Oraba y ayunaba esperando al niño.'),
            createWord('Agabo', 'Hech 11', 'Ató sus manos.', 'Predijo hambre y prisión de Pablo.')
        ]
    },
    milagros: {
        id: 'milagros', name: 'Milagros', level: 'medium', words: [
            createWord('Agua en vino', 'Juan 2', 'Primer milagro en Caná.', 'Transformación de líquido en boda.'),
            createWord('Mar Rojo', 'Éxodo 14', 'Se abrió en dos.', 'Paso en seco entre aguas.'),
            createWord('Lázaro resucita', 'Juan 11', 'Lázaro ven fuera.', 'Resurrección tras cuatro días.'),
            createWord('Panes y Peces', 'Mateo 14', 'Alimentación de los 5000.', 'Multiplicación de comida.'),
            createWord('Caminar sobre agua', 'Mateo 14', 'Pedro se hundió.', 'Desafío a la gravedad en el mar.'),
            createWord('Ciego Bartimeo', 'Marcos 10', 'Hijo de David ten misericordia.', 'Recuperó la vista en el camino.'),
            createWord('Paralítico techo', 'Marcos 2', 'Bajado por amigos.', 'Entró por arriba de la casa.'),
            createWord('Hija de Jairo', 'Marcos 5', 'Talita cumi.', 'Niña despierta de la muerte.'),
            createWord('Mujer flujo sangre', 'Marcos 5', 'Tocó el manto.', 'Sanada al tocar el borde.'),
            createWord('10 Leprosos', 'Lucas 17', 'Solo uno volvió.', 'Sanidad de piel, ingratitud.'),
            createWord('Tempestad calmada', 'Marcos 4', 'Calla, enmudece.', 'Control del clima en la barca.'),
            createWord('Moneda en pez', 'Mateo 17', 'Para el impuesto.', 'Dinero encontrado en la boca.'),
            createWord('Higuera seca', 'Marcos 11', 'No dio fruto.', 'Árbol maldecido instantáneamente.'),
            createWord('Oreja de Malco', 'Lucas 22', 'Pedro cortó, Jesús sanó.', 'Sanidad en el arresto.'),
            createWord('Pesca milagrosa', 'Lucas 5', 'Redes se rompían.', 'Muchos peces tras una noche mala.'),
            createWord('Muros de Jericó', 'Josué 6', 'Cayeron al gritar.', 'Paredes derrumbadas por sonido.'),
            createWord('Sol detenido', 'Josué 10', 'Sol detente en Gabaón.', 'Día más largo de la historia.'),
            createWord('Fuego del cielo', '1 Reyes 18', 'Elías en Carmelo.', 'Respuesta de Dios al sacrificio.'),
            createWord('Naamán sanado', '2 Reyes 5', 'Lávate 7 veces.', 'Lepra curada en el Jordán.'),
            createWord('Mano seca', 'Mateo 12', 'Extiende tu mano.', 'Sanidad en día de reposo.')
        ]
    },
    mujeres: {
        id: 'mujeres', name: 'Mujeres', level: 'medium', words: [
            createWord('María', 'Lucas 1', 'Madre de Jesús.', 'Elegida para dar a luz al Salvador.'),
            createWord('Eva', 'Génesis 3', 'Madre de todos.', 'Primera mujer, fruto prohibido.'),
            createWord('Sara', 'Génesis 17', 'Rió ante la promesa.', 'Esposa de Abraham, madre anciana.'),
            createWord('Ester', 'Ester 4', 'Para esta hora.', 'Reina que salvó a su pueblo.'),
            createWord('Rut', 'Rut 1', 'Tu Dios será mi Dios.', 'Moabita fiel, bisabuela de David.'),
            createWord('Dalila', 'Jueces 16', 'Traicionó a Sansón.', 'Descubrió el secreto de la fuerza.'),
            createWord('María Magdalena', 'Lucas 8', 'Siete demonios.', 'Primera en ver al resucitado.'),
            createWord('Marta', 'Lucas 10', 'Servía mucho.', 'Hermana preocupada de Lázaro.'),
            createWord('Rahab', 'Josué 2', 'Escondió espías.', 'Ramera de Jericó en la genealogía.'),
            createWord('Rebeca', 'Génesis 24', 'Esposa de Isaac.', 'Dio agua a los camellos.'),
            createWord('Raquel', 'Génesis 29', 'Amada de Jacob.', 'Madre de José y Benjamín.'),
            createWord('Lea', 'Génesis 29', 'Ojos delicados.', 'Primera esposa de Jacob, no amada.'),
            createWord('Miriam', 'Éxodo 15', 'Panderom, hermana.', 'Hermana de Moisés, tuvo lepra.'),
            createWord('Débora', 'Jueces 4', 'Jueza bajo palmera.', 'Lideró a Israel a la batalla.'),
            createWord('Jael', 'Jueces 4', 'Estaca en la sien.', 'Mató a Sísara en su tienda.'),
            createWord('Ana', '1 Samuel 1', 'Madre de Samuel.', 'Oró por un hijo y lo entregó.'),
            createWord('Abigail', '1 Samuel 25', 'Sabia y hermosa.', 'Evitó que David matara a Nabal.'),
            createWord('Betsabé', '2 Samuel 11', 'Madre de Salomón.', 'Esposa de Urías, vista desde el terrado.'),
            createWord('Sunamita', '2 Reyes 4', 'Hizo cuarto a Eliseo.', 'Mujer rica que hospedó al profeta.'),
            createWord('Elisabeth', 'Lucas 1', 'Madre de Juan.', 'Pariente de María, embarazada en vejez.'),
            createWord('Lidia', 'Hechos 16', 'Vendedora de púrpura.', 'Primera convertida en Europa.'),
            createWord('Priscila', 'Hechos 18', 'Esposa de Aquila.', 'Maestra de Apolos junto a su esposo.'),
            createWord('Febe', 'Romanos 16', 'Diaconisa en Cencrea.', 'Llevó la carta a los romanos.'),
            createWord('Agar', 'Génesis 16', 'Madre de Ismael.', 'Sierva egipcia de Sara.'),
            createWord('Dina', 'Génesis 34', 'Hija de Jacob.', 'Su deshonra causó una masacre.'),
            createWord('Tamar', 'Génesis 38', 'Nuera de Judá.', 'Se disfrazó para obtener descendencia.'),
            createWord('Sifrá', 'Éxodo 1', 'Partera hebrea.', 'Temió a Dios y no mató bebés.'),
            createWord('Fúa', 'Éxodo 1', 'Compañera de Sifrá.', 'Otra partera valiente.'),
            createWord('Jezabel', '1 Reyes 21', 'Esposa de Acab.', 'Reina malvada que perseguía profetas.'),
            createWord('Atalía', '2 Reyes 11', 'Reina usurpadora.', 'Mató a la descendencia real.')
        ]
    },
    lugares: {
        id: 'lugares', name: 'Lugares', level: 'medium', words: [
            createWord('Jerusalén', 'Ciudad de Paz', 'Capital de David.', 'Ciudad santa, sitio del templo.'),
            createWord('Belén', 'Casa de Pan', 'Nacimiento de Jesús.', 'Pequeña aldea de Judá.'),
            createWord('Nazaret', 'Hogar de Jesús', '¿Algo bueno de allí?', 'Donde creció el carpintero.'),
            createWord('Galilea', 'Región Norte', 'Ministerio de Jesús.', 'Región del lago y los discípulos.'),
            createWord('Jordán', 'Río de Bautismo', 'Naamán se lavó.', 'Río principal, límite de la tierra.'),
            createWord('Egipto', 'Tierra de esclavitud', 'José gobernó allí.', 'Lugar de refugio y cautiverio.'),
            createWord('Sinaí', 'Monte de la Ley', 'Moisés subió.', 'Donde se dieron los mandamientos.'),
            createWord('Jericó', 'Ciudad Palmeras', 'Muros cayeron.', 'Primera ciudad conquistada.'),
            createWord('Getsemaní', 'Prensa de aceite', 'Jesús oró allí.', 'Huerto de la agonía.'),
            createWord('Gólgota', 'Lugar Calavera', 'Crucifixión.', 'Monte de la muerte.'),
            createWord('Betania', 'Casa de dátiles', 'Lázaro vivía allí.', 'Aldea cerca de Jerusalén.'),
            createWord('Cafarnaúm', 'Aldea de Nahúm', 'Base de Jesús.', 'Ciudad a orillas del mar.'),
            createWord('Emaús', 'Camino revelación', 'Jesús caminó allí.', 'Aldea a la que iban dos discípulos.'),
            createWord('Sodoma', 'Ciudad destruida', 'Lluvia de fuego.', 'Destruida por su pecado.'),
            createWord('Nínive', 'Gran ciudad', 'Jonás predicó.', 'Capital de Asiria, se arrepintió.'),
            createWord('Babilonia', 'Confusión', 'Cautiverio.', 'Gran imperio, torre famosa.'),
            createWord('Roma', 'Capital Imperio', 'Pablo preso allí.', 'Centro del mundo antiguo.'),
            createWord('Patmos', 'Isla Apocalipsis', 'Juan exiliado.', 'Isla rocosa de la visión.'),
            createWord('Caná', 'Lugar de bodas', 'Agua en vino.', 'Lugar del primer milagro.'),
            createWord('Olivos', 'Monte de Olivos', 'Ascensión.', 'Monte frente al templo.'),
            createWord('Carmelo', 'Jardín', 'Elías vs Baal.', 'Monte del desafío de fuego.'),
            createWord('Tabor', 'Transfiguración', 'Monte alto.', 'Posible lugar de la gloria.'),
            createWord('Mar Muerto', 'Mar Salado', 'Sin vida.', 'Lago más bajo del mundo.'),
            createWord('Ur', 'De los Caldeos', 'Salida de Abraham.', 'Ciudad natal del patriarca.'),
            createWord('Antioquía', 'Primeros Cristianos', 'Llamados cristianos.', 'Base de misiones de Pablo.')
        ]
    },
    reyes: {
        id: 'reyes', name: 'Reyes', level: 'medium', words: [
            createWord('David', '2 Sam 5', 'Conforme al corazón.', 'Mató a Goliat, rey poeta.'),
            createWord('Salomón', '1 Reyes 1', 'El más sabio.', 'Construyó el templo, tuvo muchas mujeres.'),
            createWord('Saúl', '1 Samuel 10', 'El primer rey.', 'Alto, persiguió a David.'),
            createWord('Herodes Grande', 'Mateo 2', 'Matanza inocentes.', 'Rey constructor y paranoico.'),
            createWord('Faraón', 'Éxodo 5', 'Deja ir a mi pueblo.', 'Corazón endurecido en Egipto.'),
            createWord('Nabucodonosor', 'Daniel 2', 'Estatua de oro.', 'Rey de Babilonia que comió pasto.'),
            createWord('Ezequías', '2 Reyes 18', 'Rey bueno.', 'Mostró tesoros a Babilonia.'),
            createWord('Is-boset', '2 Samuel 2', 'Hijo de Saúl.', 'Rey de Israel rival de David.'),
            createWord('Roboam', '1 Reyes 12', 'Dividió el reino.', 'Hijo de Salomón, consejos de jóvenes.'),
            createWord('Jeroboam', '1 Reyes 12', 'Becerros de oro.', 'Primer rey del norte, idolatría.'),
            createWord('Asa', '1 Reyes 15', 'Rey bueno.', 'Reformador en Judá.'),
            createWord('Josafat', '1 Reyes 22', 'Canto en guerra.', 'Rey que buscó a Dios.'),
            createWord('Acab', '1 Reyes 16', 'Esposo de Jezabel.', 'Rey más malvado de Israel.'),
            createWord('Jeú', '2 Reyes 9', 'Manejaba locamente.', 'Mató a la casa de Acab.'),
            createWord('Joás', '2 Reyes 11', 'Rey niño.', 'Escondido en el templo 6 años.'),
            createWord('Uzías', '2 Reyes 15', 'Lepra en frente.', 'Rey fuerte hasta que ofreció incienso.'),
            createWord('Manasés', '2 Reyes 21', 'Muy malo, luego bueno.', 'Reinó 55 años, derramó sangre.'),
            createWord('Josías', '2 Reyes 22', 'Halló el libro.', 'Rey niño reformador.'),
            createWord('Sedequías', '2 Reyes 24', 'Último rey.', 'Ojos sacados, llevado a Babilonia.'),
            createWord('Ciro', 'Esdras 1', 'Rey persa.', 'Permitió el regreso de los judíos.'),
            createWord('Darío', 'Daniel 6', 'Foso de leones.', 'Rey medo que amaba a Daniel.'),
            createWord('Artajerjes', 'Nehemías 2', 'Copa de vino.', 'Rey persa que envió a Nehemías.'),
            createWord('Agripa', 'Hechos 26', 'Por poco me persuades.', 'Escuchó la defensa de Pablo.'),
            createWord('Herodes Antipas', 'Lucas 23', 'Zorra.', 'Mató a Juan, vio a Jesús.')
        ]
    },
    bandas: {
        id: 'bandas', name: 'Música Cristiana', level: 'medium', words: [
            createWord('Hillsong', 'Australia', 'Banda de adoración australiana.', 'Famosos por "Oceans" y conferencias.'),
            createWord('Marcos Witt', 'México', 'Pionero alabanza.', 'Cantante de "Renuévame" y "Enciende una luz".'),
            createWord('Jesús A. Romero', 'México', 'Princesas Mágicas.', 'Cantante de melodías románticas cristianas.'),
            createWord('Miel San Marcos', 'Guatemala', 'No hay lugar mas alto.', 'Banda familiar de adoración profética.'),
            createWord('Barak', 'Rep. Dom.', 'Ven Espíritu Santo.', 'Fuego y poder en sus canciones.'),
            createWord('Redimi2', 'Rep. Dom.', 'Trap cristiano.', 'Rapero que dice "Who is the boss?".'),
            createWord('Tercer Cielo', 'Rep. Dom.', 'Creeré.', 'Dúo esposo y esposa, baladas pop.'),
            createWord('Alex Campos', 'Colombia', 'Al taller del maestro.', 'Rock pop con voz particular.'),
            createWord('Christine DClario', 'EEUU', 'Como dijiste.', 'Adoradora con gran voz y raíces de PR.'),
            createWord('Marco Barrientos', 'México', 'Sin reservas.', 'Líder de adoración "Espíritu Santo ven".'),
            createWord('Elevation', 'EEUU', 'La tumba está vacía.', 'Banda de una iglesia grande en Charlotte.'),
            createWord('Maverick City', 'EEUU', 'Jireh.', 'Colectivo diverso de adoración.'),
            createWord('Rescate', 'Argentina', 'Rock cristiano.', 'Banda de rock argentina "Soy locos".'),
            createWord('Petra', 'EEUU', 'Rock clásico.', 'Pioneros del rock cristiano en inglés.'),
            createWord('Stryper', 'EEUU', 'Metal cristiano.', 'Tiraban biblias al público.'),
            createWord('DC Talk', 'EEUU', 'Jesus Freak.', 'Trío famoso en los 90s.'),
            createWord('Casting Crowns', 'EEUU', 'Who am I.', 'Banda de un pastor de jóvenes.'),
            createWord('MercyMe', 'EEUU', 'I can only imagine.', 'Canción más famosa de la historia cristiana.'),
            createWord('Kike Pavón', 'España', 'Empezar de nuevo.', 'Cantante español juvenil.'),
            createWord('Evan Craft', 'EEUU', 'Canta en español.', 'Gringo que ama a los latinos.')
        ]
    },
    random: {
        id: 'random', name: 'Aleatorio', level: 'hard', words: [
            createWord('Amén', 'Apocalipsis', 'Así sea.', 'Palabra final de las oraciones.'),
            createWord('Aleluya', 'Salmos', 'Alabado sea Jehová.', 'Expresión de júbilo.'),
            createWord('Diezmo', 'Malaquías', 'El 10 por ciento.', 'Parte que se devuelve a Dios.'),
            createWord('Ayuno', 'Mateo 6', 'No comer.', 'Privarse de alimentos para orar.'),
            createWord('Oración', 'Mateo 6', 'Hablar con Dios.', 'Comunicación con el Padre.'),
            createWord('Fe', 'Hebreos 11', 'Certeza de lo que espera.', 'Creer sin ver.'),
            createWord('Gracia', 'Efesios 2', 'Regalo inmerecido.', 'Favor de Dios que no merecemos.'),
            createWord('Pecado', 'Romanos 3', 'Errar al blanco.', 'Lo que nos separa de Dios.'),
            createWord('Arrepentimiento', 'Hechos 2', 'Cambio de mente.', 'Volverse de los malos caminos.'),
            createWord('Santidad', '1 Pedro 1', 'Apartado para Dios.', 'Sed santos porque yo soy santo.'),
            createWord('Unción', '1 Juan 2', 'Poder del Espíritu.', 'Aceite derramado o poder especial.'),
            createWord('Bautismo', 'Mateo 28', 'Sumergir.', 'Ordenanza de agua.'),
            createWord('Santa Cena', '1 Corintios 11', 'Pan y vino.', 'Memorial de la muerte de Jesús.'),
            createWord('Púlpito', 'Nehemías 8', 'Lugar de predicación.', 'Mueble de madera para predicar.'),
            createWord('Ofrenda', 'Lucas 21', 'Dar con alegría.', 'Lo que se da voluntariamente.'),
            createWord('Misionero', 'Hechos 13', 'Enviado.', 'El que va a predicar a otro lado.'),
            createWord('Diácono', '1 Timoteo 3', 'Servidor.', 'Ayuda en las mesas y a los pobres.'),
            createWord('Anciano', 'Tito 1', 'Líder de iglesia.', 'Pastor o supervisor.'),
            createWord('Hermanos', 'Salmos 133', 'Convivencia en armonía.', 'Miembros de la familia de fe.'),
            createWord('Jubileo', 'Levítico 25', 'Año 50.', 'Año de libertad y restitución.')
        ]
    },
    reformadores: {
        id: 'reformadores', name: 'Historia Iglesia', level: 'hard', words: [
            createWord('Lutero', 'Alemania', '95 Tesis.', 'Martillo en la puerta de Wittenberg.'),
            createWord('Calvino', 'Ginebra', 'Institución.', 'Teólogo de la predestinación.'),
            createWord('Zuinglio', 'Suiza', 'Reforma suiza.', 'Contemporáneo de Lutero en Zurich.'),
            createWord('John Knox', 'Escocia', 'Presbiterianismo.', 'Reformador escocés fiero.'),
            createWord('Wycliffe', 'Inglaterra', 'Estrella matutina.', 'Tradujo la Biblia al inglés antes de la reforma.'),
            createWord('Hus', 'Bohemia', 'Ganso cocinado.', 'Quemado en la hoguera, predijo a Lutero.'),
            createWord('Spurgeon', 'Inglaterra', 'Príncipe predicadores.', 'Predicador bautista victoriano.'),
            createWord('Wesley', 'Inglaterra', 'Metodismo.', 'Jinete de Dios, corazón ardiente.'),
            createWord('Whitefield', 'Inglaterra', 'Gran Despertar.', 'Predicaba al aire libre a miles.'),
            createWord('Edwards', 'EEUU', 'Pecadores en manos.', 'Teólogo del avivamiento americano.'),
            createWord('Agustín', 'Hipona', 'Confesiones.', 'Padre de la iglesia, hijo de Mónica.'),
            createWord('Constantino', 'Roma', 'Edicto de Milán.', 'Emperador que legalizó el cristianismo.'),
            createWord('Francisco Asís', 'Italia', 'Pobreza.', 'Amigo de los animales, monje pobre.'),
            createWord('San Pedro', 'Vaticano', 'Primer Papa (según católicos).', 'Pescador que lideró la iglesia.'),
            createWord('Pablo', 'Tarso', 'Apóstol gentiles.', 'Escribió gran parte del NT.'),
            createWord('Policarpo', 'Esmirna', 'Discípulo de Juan.', 'Obispo mártir que no negó a Cristo.'),
            createWord('Tyndale', 'Inglaterra', 'Traductor mártir.', 'Estrangulado y quemado por traducir.'),
            createWord('Moody', 'EEUU', 'Evangelista.', 'Zapatero que se convirtió en predicador.'),
            createWord('Billy Graham', 'EEUU', 'Cruzadas.', 'Evangelista del siglo XX, estadios llenos.'),
            createWord('C.S. Lewis', 'Inglaterra', 'Narnia.', 'Apologista y escritor de fantasía.')
        ]
    },
    villanos: {
        id: 'villanos', name: 'Villanos Bíblicos', level: 'medium', words: [
            createWord('Satanás', 'Job 1', 'El adversario.', 'El enemigo de nuestras almas.'),
            createWord('Caín', 'Génesis 4', 'Mató a Abel.', 'El primer asesino.'),
            createWord('Faraón', 'Éxodo', 'No dejó ir.', 'Oprimió a Israel en Egipto.'),
            createWord('Goliat', '1 Samuel 17', 'Gigante filisteo.', 'Derrotado por una piedra.'),
            createWord('Dalila', 'Jueces 16', 'Cortó el pelo.', 'Engañó al hombre más fuerte.'),
            createWord('Jezabel', '1 Reyes 21', 'Pintada los ojos.', 'Reina que perseguía a Elías.'),
            createWord('Herodes', 'Mateo 2', 'Mató niños.', 'Rey celoso del nacimiento de Jesús.'),
            createWord('Judas', 'Lucas 22', 'Traidor.', 'Vendió al maestro por 30 monedas.'),
            createWord('Pilato', 'Mateo 27', 'Se lavó las manos.', 'Condenó a Jesús siendo inocente.'),
            createWord('Absalón', '2 Samuel 15', 'Hijo rebelde.', 'Se rebeló contra su padre David; pelo largo.'),
            createWord('Aman', 'Ester 3', 'Quería matar judíos.', 'Enemigo de Mardoqueo, colgado en su horca.'),
            createWord('Nabucodonosor', 'Daniel 3', 'Horno de fuego.', 'Rey que destruyó Jerusalén.'),
            createWord('Saúl', '1 Samuel 18', 'Envidioso.', 'Persiguió a David por celos.'),
            createWord('Balaam', 'Números 22', 'Amó el lucro.', 'Quiso maldecir a Israel pero no pudo.'),
            createWord('Core', 'Números 16', 'Rebelión.', 'La tierra se lo tragó vivo.'),
            createWord('Acab', '1 Reyes 21', 'Rey débil.', 'Esposo de Jezabel, codició una viña.'),
            createWord('Herodes Antipas', 'Marcos 6', 'Cortó cabeza Juan.', 'Pidió la cabeza del bautista.'),
            createWord('Ananías', 'Hechos 5', 'Mintió al Espíritu.', 'Cayó muerto por retener dinero.'),
            createWord('Safira', 'Hechos 5', 'Esposa de Ananías.', 'Murió igual que su esposo.'),
            createWord('Bestia', 'Apocalipsis 13', '666.', 'El anticristo del final.')
        ]
    }
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
        <circle cx="50" cy="60" r="20" className="fill-indigo-100" />
        <path d="M30 50 Q 35 30 50 30 Q 65 30 70 50" className="fill-none stroke-slate-800 stroke-[3px]" />
        <circle cx="30" cy="45" r="5" className="fill-slate-800" />
        <circle cx="35" cy="35" r="5" className="fill-slate-800" />
        <circle cx="45" cy="30" r="5" className="fill-slate-800" />
        <circle cx="55" cy="30" r="5" className="fill-slate-800" />
        <circle cx="65" cy="35" r="5" className="fill-slate-800" />
        <circle cx="70" cy="45" r="5" className="fill-slate-800" />
        <circle cx="43" cy="60" r="2" className="fill-slate-900" />
        <circle cx="57" cy="60" r="2" className="fill-slate-900" />
        <path d="M45 70 Q 50 75 55 70" className="stroke-slate-900 stroke-[2px] fill-none" />
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
                    <button onClick={() => { if (triggerSound) triggerSound('click'); onClose(); }} className="p-1 hover:bg-slate-200 rounded-full"><X size={20} className="text-slate-500" /></button>
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
        <CheckCircle size={16} className="text-green-400" />
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
        setTimeout(() => setMascotSpeech(""), 8000);
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
                const newCats = { ...prev };
                delete newCats.custom_added;
                return newCats;
            }
            return { ...prev, custom_added: { ...prev.custom_added, words: newWords } };
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
        link.download = `fariseo_backup_${new Date().toISOString().slice(0, 10)}.sav`;
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

            if (data.players) setPlayers(data.players);
            if (data.partyStats) setPartyStats(data.partyStats);
            if (data.vigiliaModeEnabled !== undefined) setVigiliaModeEnabled(data.vigiliaModeEnabled);
            if (data.vigiliaRounds) setVigiliaRounds(data.vigiliaRounds);
            if (data.settings) {
                setImpostorCount(data.settings.impostorCount);
                setTimerDuration(data.settings.timerDuration);
                setTimerEnabled(data.settings.timerEnabled);
                setGameFlow(data.settings.gameFlow);
                setShowCategoryToImpostor(data.settings.showCategoryToImpostor);
                setAiHintEnabled(data.settings.aiHintEnabled);
                setVibrationEnabled(data.settings.vibrationEnabled);
                setAiContextEnabled(data.settings.aiContextEnabled);
            }
            if (data.selectedCats) setSelectedCats(data.selectedCats);

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
        if (retryData) currentPlayers = retryData.originalPlayers.map(p => ({ ...p, isDead: false }));
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
            while (wordList.length < currentPlayers.length) wordList = [...wordList, ...activeWords];
        }
        const mainWord = wordList[Math.floor(Math.random() * wordList.length)];

        setGeneratedAiHint('');
        setGeneratedAiContext('');

        if (aiHintEnabled) {
            setGeneratedAiHint(mainWord.clue || "Pista no disponible.");
        }

        if (aiContextEnabled) {
            setGeneratedAiContext(category.name + ": " + (mainWord.content || ""));
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
        setGameData(prev => ({ ...prev, round: prev.round + 1 }));
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
                            <Save size={18} />
                        </button>
                        <button onClick={() => { setMusicEnabled(!musicEnabled); triggerSound('click'); }} className={`p-2 rounded-full hover:bg-slate-600 ${!musicEnabled ? 'text-slate-500 bg-slate-800' : 'bg-slate-700 text-indigo-400'}`}>
                            <Music size={18} />
                        </button>
                        <button onClick={() => { setSoundEnabled(!soundEnabled); triggerSound('click'); }} className={`p-2 rounded-full hover:bg-slate-600 ${!soundEnabled ? 'text-slate-500 bg-slate-800' : 'bg-slate-700'}`}>
                            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                        </button>
                        <button onClick={() => { setInfoTab('instructions'); setShowInfo(true); triggerSound('click'); }} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600"><Info size={18} /></button>
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
                            {showResultModal?.type === 'success' ? <CheckCircle size={32} /> : <XCircle size={32} />}
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
                                <FileJson size={18} /> Archivo (Recomendado)
                            </h4>
                            <p className="text-xs text-slate-600 mb-3">Descarga tu partida en un archivo seguro para no perder nada.</p>

                            <div className="flex gap-2 mb-3">
                                <Button onClick={downloadBackupFile} variant="primary" className="text-xs py-2">
                                    <Download size={16} /> Descargar .SAV
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
                                    <FileUp size={16} /> Seleccionar Archivo para Cargar
                                </label>
                            </div>
                        </div>

                        {/* OPCIÓN 2: TEXTO */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                                <ClipboardCopy size={18} /> Código de Texto
                            </h4>
                            <div className="flex items-start gap-2 bg-amber-50 p-2 rounded border border-amber-200 mb-2">
                                <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
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
                                    <Copy size={14} /> Copiar
                                </Button>
                                <Button onClick={async () => {
                                    try {
                                        const text = await navigator.clipboard.readText();
                                        setBackupText(text);
                                        setTimeout(importData, 100);
                                    } catch (e) {
                                        showNotification("No se pudo leer el portapapeles.");
                                    }
                                }} variant="secondary" className="py-1 text-xs">
                                    <Upload size={14} /> Cargar Texto
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
                                            <button onClick={() => saveCatTitle(previewCatId)} className="text-green-600"><CheckSquare /></button>
                                        </>
                                    ) : (
                                        <>
                                            <h3 className="font-bold text-lg text-slate-800 flex-1">{categories[previewCatId].name}</h3>
                                            <button onClick={() => { setNewCatTitle(categories[previewCatId].name); setEditingCatTitle(true); }} className="text-slate-400"><PenLine size={16} /></button>
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
                                            {w.active !== false ? <CheckSquare size={18} /> : <Square size={18} />}
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
                                    <button onClick={() => handleDeleteCustomWord(w.term)} className="text-red-500"><Trash2 size={16} /></button>
                                </div>
                            ))
                        ) : <p className="text-slate-500 text-center italic">No hay palabras agregadas.</p>}
                        {categories.custom_added && (
                            <button onClick={() => { setCategories(prev => { const n = { ...prev }; delete n.custom_added; return n; }); }} className="w-full text-red-600 text-xs font-bold mt-4 border border-red-200 p-2 rounded">Eliminar Todas</button>
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
                                    <Instagram size={16} className="text-indigo-500" />
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <a href="https://github.com/zorropoetico/elfariseoinfiltrado" target="_blank" rel="noreferrer" className="text-sm text-slate-700 hover:underline flex items-center justify-center gap-1">
                                        GitHub
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.05-.015-2.055-3.33.72-4.035-1.605-4.035-1.605-.54-1.38-1.335-1.755-1.335-1.755-1.085-.735.09-.72.09-.72 1.2.075 1.83 1.23 1.83 1.23 1.065 1.815 2.805 1.29 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405 1.02 0 2.04.135 3 .405 2.295-1.545 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.92 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                                    </a>
                                </div>
                                <p className="font-bold text-slate-700 text-sm">CCO Peniel</p>
                            </div>

                            <div className="my-2">
                                <p className="text-xs text-slate-500 mb-2">La donación será destinada al Grupo de Pre, Ados y Jovs de la iglesia y el trabajo ministerial. Cualquier comentario, no duden en contactarme.</p>
                                <a href='https://matecito.co/comunicadorcristiano' rel='noopener noreferrer' target='_blank'>
                                    <img
                                        src='https://cdn.matecito.co/assets/images/button_11.png'
                                        alt='Convidame un Matecito'
                                        className="mx-auto h-10 hover:scale-105 transition-transform"
                                    />
                                </a>
                            </div>

                            <p className="text-slate-500 text-sm italic border-l-4 border-amber-400 pl-3 text-left bg-slate-50 p-2 rounded">
                                "Y todo lo que hagáis, hacedlo de corazón, como para el Señor y no para los hombres." - Colosenses 3:23
                            </p>

                            <div className="text-xs text-slate-500 mt-4 flex items-center justify-center gap-1 flex-wrap">
                                Este juego está bajo licencia <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" className="underline">CC BY-SA 4.0</a>
                                <img src="https://mirrors.creativecommons.org/presskit/icons/cc.svg" alt="" style={{ maxWidth: "1em", maxHeight: "1em", marginLeft: ".2em" }} />
                                <img src="https://mirrors.creativecommons.org/presskit/icons/by.svg" alt="" style={{ maxWidth: "1em", maxHeight: "1em", marginLeft: ".2em" }} />
                                <img src="https://mirrors.creativecommons.org/presskit/icons/sa.svg" alt="" style={{ maxWidth: "1em", maxHeight: "1em", marginLeft: ".2em" }} />
                            </div>
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
                                    <button onClick={() => { handlePlayerCountChange(-1); setGameModeIndex(0); }} className="p-1 text-slate-600 hover:bg-white rounded transition"><UserMinus size={16} /></button>
                                    <span className="font-mono font-bold text-lg text-slate-800 w-5 text-center">{players.length}</span>
                                    <button onClick={() => handlePlayerCountChange(1)} className="p-1 text-slate-600 hover:bg-white rounded transition"><Users size={16} /></button>
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
                                        <Flame size={16} className={vigiliaModeEnabled ? 'text-amber-600' : 'text-slate-400'} /> Vigilia
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
                                        <label className="text-xs text-slate-600 font-medium flex items-center gap-1">Ver Pista para el Fariseo <span className="text-amber-500 font-bold">?</span></label>
                                        <button onClick={() => setAiHintEnabled(!aiHintEnabled)} className={`w-10 h-5 rounded-full relative transition ${aiHintEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                                            <div className={`absolute w-3 h-3 bg-white rounded-full top-1 transition-all ${aiHintEnabled ? 'left-6' : 'left-1'}`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-slate-600 font-medium flex items-center gap-1">Ver Pista para el Fiel <span className="text-indigo-500 font-bold">?</span></label>
                                        <button onClick={() => setAiContextEnabled(!aiContextEnabled)} className={`w-10 h-5 rounded-full relative transition ${aiContextEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                                            <div className={`absolute w-3 h-3 bg-white rounded-full top-1 transition-all ${aiContextEnabled ? 'left-6' : 'left-1'}`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <label className={`text-xs font-medium ${timerEnabled ? 'text-slate-600' : 'text-slate-300'}`}>Vibrar y sonar al terminar la ronda</label>
                                        <button disabled={!timerEnabled} onClick={() => setVibrationEnabled(!vibrationEnabled)} className={`p-1 rounded ${vibrationEnabled && timerEnabled ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300 bg-slate-100'}`}>
                                            {vibrationEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
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
                                    <Sparkles size={14} className="text-indigo-500 ml-1" />
                                    <input
                                        type="text"
                                        value="Próximamente..."
                                        disabled={true}
                                        readOnly
                                        className="flex-1 text-xs bg-transparent focus:outline-none text-slate-400 placeholder-slate-300"
                                    />
                                    <button disabled={true} className="text-slate-300 p-1 cursor-not-allowed">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                                <div className="bg-slate-100 p-2 rounded-lg border border-slate-200 flex gap-2 items-center"> {/* Removed relative */}
                                    <PlusCircle size={14} className="text-slate-500 ml-1" />
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
                                        <ChevronRight size={16} />
                                    </button>
                                    {/* Divider */}
                                    <div className="w-px h-4 bg-slate-300 mx-1"></div>
                                    <button onClick={() => setShowCustomWordsModal(true)} className="p-1 text-slate-400 hover:text-slate-600">
                                        <Edit3 size={14} />
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
                                            className={`relative rounded-md px-2 py-2 text-xs font-bold transition-all border flex items-center justify-between cursor-pointer ${isSelected
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
                                                            <span className="text-amber-500 text-[10px] font-bold uppercase block flex items-center justify-center gap-1"><HelpCircle size={10} /> Pista Oculta</span>
                                                            {isGeneratingHint ? (
                                                                <div className="flex justify-center p-2"><Loader2 size={16} className="animate-spin text-amber-500" /></div>
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
                                                                    <span className="font-bold flex items-center gap-1"><HelpCircle size={10} /> Pista:</span>
                                                                    <button onClick={(e) => { e.stopPropagation(); setShowContextModal(false); }}><X size={14} /></button>
                                                                </div>
                                                                <p className="mt-1 italic">{generatedAiContext || "Cargando sabiduría..."}</p>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setShowContextModal(true); }}
                                                                className="text-[10px] text-indigo-500 underline flex items-center justify-center gap-1 w-full"
                                                            >
                                                                ¿Qué es esto? <HelpCircle size={10} />
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
                                <Flame size={12} /> Ronda de Vigilia
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
                                    <MicOff className="inline mr-2" size={18} />
                                    {gameData.players[gameData.specialRoleIndices.zacarias].name} está mudo.
                                </p>
                            </div>
                        )}
                        {gameData.specialRoleIndices.sumo !== -1 && (
                            <div className="bg-amber-900/50 p-4 rounded-lg mb-4 border border-amber-500 w-full">
                                <h3 className="text-amber-300 font-bold uppercase text-xs">Sumo Sacerdote</h3>
                                <p className="text-white font-bold text-lg">
                                    <Crown className="inline mr-2" size={18} />
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
                                    <Clock size={48} className="mx-auto text-slate-600 mb-2" />
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
                                            {isSelected ? <CheckCircle size={20} /> : <Gavel size={20} />}
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
                                <div className="text-green-500 bg-green-500/10 p-4 rounded-full inline-block mb-4"><UserMinus size={48} /></div>
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
                                    <button onClick={() => setShowResetStatsConfirm(true)} className="text-[10px] text-red-600 bg-red-100 px-2 py-1 rounded hover:bg-red-200 border border-red-200 flex items-center gap-1"><RefreshCw size={10} /> Reset</button>
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


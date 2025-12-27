import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Users, UserMinus, Play, Eye, EyeOff,
    Settings, BookOpen, Info, Volume2, VolumeX,
    HelpCircle, ChevronRight, Gavel, X, Clock, ExternalLink,
    Crown, MicOff, Edit3, ScrollText, Sword, ChevronLeft, Music,
    Trophy, AlertTriangle, Flame, PlusCircle, Trash2, Save, Upload, RefreshCw, LogOut, CheckSquare, Square, PenLine, ClipboardCopy, CheckCircle, XCircle, Copy, Download, Instagram, FileJson, FileUp
} from 'lucide-react';



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
const createWord = (term, ref, faithfulClue, impostorClue, active = true) => ({ term, ref, faithfulClue, impostorClue, active });

const BASE_CATEGORIES = {
    // --- PERSONAJES ---
    vida_jesus: {
        id: 'vida_jesus', name: 'Vida de Jesús', type: 'personajes', words: [
            createWord('Jesús', 'Mateo 1:21', 'El ángel le dijo a José que le pusiera este nombre porque Él salvaría a su pueblo de sus pecados.', 'Protagonista'),
            createWord('Pedro', 'Mateo 14:29', 'Pescador, negó a Jesús 3 veces y caminó sobre el agua.', 'Caminó sobre algo inestable.'),
            createWord('Judas Iscariote', 'Mateo 26:14-16', 'Traicionó a Jesús por 30 monedas de plata.', 'Manejaba la plata del grupo.'),
            createWord('Poncio Pilato', 'Mateo 27:24', 'Gobernador romano que condenó a Jesús cediendo a la presión.', 'Se lavó las manos en público.'),
            createWord('Nicodemo', 'Juan 3:1-2', 'Fariseo que preguntó cómo se puede nacer de nuevo.', 'Iba de visita solo de noche.'),
            createWord('Zaqueo', 'Lucas 19:4', 'Publicano bajito, devolvió cuadruplicado lo robado tras ver a Jesús.', 'Se subió a un árbol.'),
            createWord('Lázaro', 'Juan 11:43-44', 'Hermano de Marta y María, Jesús lo resucitó tras 4 días.', 'Salió envuelto en vendas.'),
            createWord('Bartimeo', 'Marcos 10:46', 'Ciego en Jericó que recuperó la vista por su fe.', 'Gritó mucho al costado del camino.'),
            createWord('La mujer samaritana', 'Juan 4:7-18', 'Tuvo 5 maridos y habló con Jesús junto al pozo de Jacob.', 'Fue a buscar agua al mediodía.'),
            createWord('Jairo', 'Marcos 5:22', 'Jefe de la sinagoga, Jesús resucitó a su hija de 12 años.', 'Su hija estaba muy enferma.'),
            createWord('El joven rico', 'Mateo 19:21-22', 'Cumplía la ley pero no quiso vender sus bienes para seguir a Jesús.', 'Se fue triste de una reunión.'),
            createWord('Malco', 'Juan 18:10', 'Siervo del sumo sacerdote, Pedro lo hirió y Jesús lo sanó.', 'Perdió una oreja en una pelea.'),
            createWord('Simón de Cirene', 'Lucas 23:26', 'Ayudó a Jesús a cargar la cruz camino al Gólgota.', 'Le obligaron a cargar algo pesado.'),
            createWord('Barrabás', 'Mateo 27:16-26', 'Preso famoso (ladrón/homicida) liberado en lugar de Jesús.', 'Salió libre gracias a la gente.'),
            createWord('Los Magos (Sabios)', 'Mateo 2:1-11', 'Vinieron del oriente con oro, incienso y mirra.', 'Siguieron una luz en el cielo.'),
            createWord('Simeón', 'Lucas 2:25-30', 'Anciano en el templo que profetizó sobre el bebé Jesús.', 'No podía morir sin ver algo.'),
            createWord('José de Arimatea', 'Mateo 27:57-60', 'Miembro noble del concilio, pidió el cuerpo de Jesús.', 'Prestó su propia tumba.'),
            createWord('El ladrón en la cruz (Dimas)', 'Lucas 23:42-43', 'Reconoció a Jesús en la crucifixión: "Acuérdate de mí".', 'Se salvó en el último minuto.'),
            createWord('La suegra de Pedro', 'Mateo 8:14-15', 'Jesús la sanó y ella se levantó a servirles.', 'Tenía mucha fiebre.'),
            createWord('La mujer del flujo de sangre', 'Marcos 5:25-29', 'Gastó todo en médicos, sanó al tocar le manto de Jesús.', 'Tocó un borde de ropa.'),
            createWord('El paralítico de Betesda', 'Juan 5:5-8', 'Estuvo enfermo 38 años, Jesús le dijo "Toma tu lecho y anda".', 'Esperaba que se moviera el agua.')
        ]
    },
    enemigos: {
        id: 'enemigos', name: 'Enemigos de Dios', type: 'personajes', words: [
            createWord('Faraón (del Éxodo)', 'Éxodo 7-14', 'No dejaba ir al pueblo, sufrió las 10 plagas.', 'Se le endureció el corazón.'),
            createWord('Goliat', '1 Samuel 17', 'Gigante filisteo derrotado por una piedra de honda.', 'Se burló de un ejército entero.'),
            createWord('Herodes el Grande', 'Mateo 2:16', 'Rey que intentó matar a Jesús niño en Belén.', 'Mandó matar bebés.'),
            createWord('Herodes Antipas', 'Marcos 6:21-27', 'Decapitó a Juan el Bautista y se burló de Jesús.', 'Le pidió un baile a su hijastra.'),
            createWord('Amán', 'Ester 3:5-6', 'Enemigo en el libro de Ester, construyó una horca para Mardoqueo.', 'Odiaba que no se arrodillaran ante él.'),
            createWord('Sanbalat', 'Nehemías 4:1-3', 'Opositor principal de Nehemías en la reconstrucción del muro.', 'Se burlaba de los albañiles.'),
            createWord('Absalón', '2 Samuel 18:9', 'Hijo de David que se rebeló e intentó usurpar el trono.', 'Quedó colgado por el pelo.'),
            createWord('Adonías', '1 Reyes 1:5', 'Hijo de David que intentó reinar antes que Salomón.', 'Se autoproclamó rey antes de tiempo.'),
            createWord('Atalía', '2 Reyes 11:1', 'Mató a todos sus nietos (menos a Joás) para reinar en Judá.', 'Una abuela asesina.'),
            createWord('Sísara', 'Jueces 4:21', 'General cananeo derrotado por Débora y Barac, muerto por Jael.', 'Le clavaron una estaca durmiendo.'),
            createWord('Satanás', 'Génesis 3 / Mateo 4', 'El acusador, tentó a Jesús y a Eva.', 'Se disfrazó de serpiente.'),
            createWord('La Bestia (Anticristo)', 'Apocalipsis 13:1', 'Personaje de Apocalipsis que surge del mar y exige adoración.', 'Tenía un número famoso (666).'),
            createWord('Simón el Mago', 'Hechos 8:18-19', 'Ofreció dinero a los apóstoles por el Espíritu Santo.', 'Quiso comprar el poder de Dios.'),
            createWord('Elimas (Barjesús)', 'Hechos 13:8-11', 'Hechicero que estorbaba a Pablo en Chipre.', 'Quedó ciego por oponerse.'),
            createWord('Senaquerib', '2 Reyes 18:13', 'Rey asirio que sitió Jerusalén en tiempos de Ezequías.', 'Envió cartas amenazantes.'),
            createWord('Coré', 'Números 16:31-32', 'Levita que lideró una rebelión contra Moisés y Aarón.', 'La tierra se lo tragó.'),
            createWord('Caín', 'Génesis 4:8', 'Mató a su hermano Abel por celos de su ofrenda.', 'El primer asesino.'),
            createWord('Abimelec (hijo de Gedeón)', 'Jueces 9:5', 'Hijo de Gedeón que usurpó el poder en Siquem.', 'Mató a 70 hermanos sobre una piedra.'),
            createWord('Nabal', '1 Samuel 25:25', 'Esposo grosero de Abigail, murió del corazón tras una borrachera.', 'Su nombre significa "necio".'),
            createWord('Doeg edomita', '1 Samuel 22:18', 'Espía de Saúl que masacró a los sacerdotes de Nob.', 'Mató a los sacerdotes.')
        ]
    },
    sacerdotes: {
        id: 'sacerdotes', name: 'Sacerdotes y Religiosos', type: 'personajes', words: [
            createWord('Aarón', 'Números 17:8', 'Primer Sumo Sacerdote, hermano de Moisés.', 'Su vara floreció.'),
            createWord('Elí', '1 Samuel 4:18', 'Sumo sacerdote que crio a Samuel, tenía hijos perversos.', 'Se cayó de la silla y murió.'),
            createWord('Finees', 'Números 25:7-8', 'Nieto de Aarón, celoso por Dios, ejecutó a una pareja inmoral.', 'Usó una lanza para detener una plaga.'),
            createWord('Sadoc', '1 Reyes 1:39', 'Sacerdote que ungió a Salomón; su linaje fue el elegido.', 'Fiel a David en la rebelión.'),
            createWord('Esdras', 'Esdras 7:6', 'Lideró el retorno del exilio y enseñó la Ley al pueblo.', 'Era escriba y sacerdote.'),
            createWord('Zacarías (padre de Juan)', 'Lucas 1:20', 'Sacerdote que vio al ángel Gabriel en el santuario.', 'Se quedó mudo en el trabajo.'),
            createWord('Caifás', 'Juan 11:49-50', 'Sumo sacerdote que presidió el juicio contra Jesús.', 'Dijo que convenía que muriera uno solo.'),
            createWord('Anás', 'Juan 18:13', 'Ex sumo sacerdote, interrogaron a Jesús primero en su casa.', 'El suegro del jefe.'),
            createWord('Melquisedec', 'Génesis 14:18', 'Rey de Salem y sacerdote, Abraham le dio los diezmos.', 'No tenía padre ni madre (en registro).'),
            createWord('Joiada', '2 Reyes 11:4', 'Sacerdote que protegió al niño rey Joás y derrocó a Atalía.', 'Organizó un golpe de estado santo.'),
            createWord('Josué (Sumo Sacerdote)', 'Zacarías 3:3-4', 'Sacerdote en Zacarías, Satanás lo acusaba, Dios le cambió las ropas.', 'Tenía ropa sucia en una visión.'),
            createWord('Ahimelec', '1 Samuel 21:6', 'Sacerdote de Nob que ayudó a David y le dio la espada de Goliat.', 'Le dio pan sagrado a un fugitivo.'),
            createWord('Gamaliel', 'Hechos 5:34', 'Fariseo respetado, maestro de Pablo, aconsejó no matar a los apóstoles.', 'Maestro de un apóstol famoso.'),
            createWord('Jetro', 'Éxodo 18:17-23', 'Sacerdote de Madián, suegro de Moisés.', 'Aconsejó delegar tareas.'),
            createWord('Uza', '2 Samuel 6:6-7', 'Murió al sostener el Arca del Pacto cuando los bueyes tropezaron.', 'Tocó lo que no debía y murió.'),
            createWord('Pasur', 'Jeremías 20:2', 'Sacerdote que puso a Jeremías en el cepo.', 'Golpeó a un profeta.'),
            createWord('Abiatar', '1 Samuel 22:20', 'Escapó de Nob a David, luego Salomón lo destituyó.', 'Único sobreviviente de una masacre.'),
            createWord('Hilcías', '2 Reyes 22:8', 'Sumo sacerdote que halló el Libro de la Ley en tiempos de Josías.', 'Encontró un libro viejo y polvoriento.'),
            createWord('Simeón (Hijo de Jacob)', 'Génesis 42:24', 'Aunque violento, es cabeza de una tribu sacerdotal (junto a Leví).', 'Quedó preso en Egipto un tiempo.'),
            createWord('Los hijos de Esceva', 'Hechos 19:14-16', 'Judíos exorcistas atacados por un endemoniado que no respetó su autoridad.', 'Salieron corriendo desnudos.')
        ]
    },

    reyes_paganos: {
        id: 'reyes_paganos', name: 'Reyes Paganos', type: 'personajes', words: [
            createWord('Nabucodonosor', 'Daniel 4:33', 'Rey de Babilonia, destruyó Jerusalén y tuvo sueños proféticos.', 'Vivió como un animal un tiempo.'),
            createWord('Ciro', 'Esdras 1:1', 'Rey persa que decretó el regreso de los judíos y la reconstrucción.', 'Ungido aunque no era judío.'),
            createWord('Darío (el Medo)', 'Daniel 6:9', 'Rey que echó a Daniel a los leones muy a su pesar.', 'Lo engañaron para firmar una ley.'),
            createWord('Asuero (Jerjes)', 'Ester 6:1', 'Esposo de Ester, rey de Persia que gobernaba 127 provincias.', 'No podía dormir y pidió que le leyeran.'),
            createWord('Artajerjes', 'Nehemías 2:1', 'Rey que dio permiso a Nehemías para ir a Jerusalén.', 'Vio triste a su copero.'),
            createWord('Belsasar', 'Daniel 5:5', 'Último rey de Babilonia, usó los vasos del templo para una fiesta.', 'Vio una mano escribiendo en la pared.'),
            createWord('Og de Basán', 'Deuteronomio 3:11', 'Rey gigante derrotado por Moisés, su cama era de hierro.', 'Tenía una cama gigante.'),
            createWord('Balac', 'Números 22:2', 'Rey de Moab que pagó a Balaam para maldecir a Israel.', 'Contrató a un brujo.'),
            createWord('Eglón', 'Jueces 3:17', 'Rey de Moab asesinado por Aod en su sala de verano.', 'Era muy gordo.'),
            createWord('Hiram', '1 Reyes 5:1', 'Rey de Tiro, amigo de David y Salomón, proveyó cedros para el Templo.', 'Mandaba mucha madera.'),
            createWord('Hazael', '2 Reyes 8:15', 'Rey de Siria profetizado por Eliseo, fue azote para Israel.', 'Mojó un paño y asfixió a su rey.'),
            createWord('Agag', '1 Samuel 15:32-33', 'Rey amalecita que Saúl perdonó, pero Samuel cortó en pedazos.', 'Caminaba delicadamente.'),
            createWord('César Augusto', 'Lucas 2:1', 'Emperador romano cuando nació Jesús.', 'Pidió un censo mundial.'),
            createWord('Tiberio César', 'Lucas 3:1', 'Emperador durante el ministerio de Jesús.', 'Su cara estaba en la moneda.'),
            createWord('Nerón (César)', 'Hechos 25:11', 'Emperador al que Pablo pidió ser juzgado (aunque la Biblia solo dice "César").', 'Pablo apeló a él.'),
            createWord('Rey de Nínive', 'Jonás 3:6', 'Se arrepintió tras la predicación de Jonás y salvó su ciudad.', 'Se sentó en ceniza.'),
            createWord('Adoni-bezec', 'Jueces 1:6-7', 'Rey cananeo que hacía lo mismo a otros reyes, recibió su merecido.', 'Le cortaron pulgares de manos y pies.'),
            createWord('Sijón', 'Números 21:23', 'Rey amorreo derrotado por Israel antes de entrar a la tierra prometida.', 'No dejó pasar por su carretera.'),
            createWord('La Reina de Sabá', '1 Reyes 10:1', 'Viajó de lejos para probar la sabiduría de Salomón.', 'Hizo preguntas difíciles.'),
            createWord('Ben-adad', '1 Reyes 20:16', 'Rey sirio derrotado varias veces por Acab (quien tontamente lo perdonó).', 'Se emborrachaba en las carpas.')
        ]
    },
    heroes_fe: {
        id: 'heroes_fe', name: 'Héroes de la Fe', type: 'personajes', words: [
            createWord('Esteban', 'Hechos 7:55-58', 'Primer mártir cristiano, murió apedreado mientras Saulo miraba.', 'Vio el cielo abierto antes de morir.'),
            createWord('Felipe (El evangelista)', 'Hechos 8:39', 'Predicó en Samaria y al etíope eunuco.', 'Desapareció después de un bautismo.'),
            createWord('Cornelio', 'Hechos 10:1', 'Centurión romano, primer gentil en recibir el Espíritu Santo.', 'Un soldado que oraba mucho.'),
            createWord('Bernabé', 'Hechos 4:36-37', 'Hijo de consolación, compañero de Pablo.', 'Vendió su heredad.'),
            createWord('Timoteo', '2 Timoteo 1:5', 'Joven discípulo de Pablo, pastor en Éfeso.', 'Tenía madre y abuela creyentes.'),
            createWord('Tito', 'Tito 1:5', 'Colaborador de Pablo encargado de poner orden en Creta.', 'Se quedó en una isla difícil.'),
            createWord('Apolos', 'Hechos 18:24-26', 'Judío elocuente de Alejandría, Priscila y Aquila le enseñaron más a fondo.', 'Hablaba muy bien pero sabía poco.'),
            createWord('Lidia', 'Hechos 16:14', 'Primera convertida en Europa (Filipos), hospedó a Pablo.', 'Vendía tela púrpura.'),
            createWord('Dorcas (Tabita)', 'Hechos 9:36-40', 'Mujer bondadosa de Jope que Pedro resucitó.', 'Hacía ropa para los pobres.'),
            createWord('Febe', 'Romanos 16:1', 'Diaconisa de Cencrea, portadora de la carta a los Romanos.', 'Llevó una carta importante.'),
            createWord('Onesíforo', '2 Timoteo 1:16', 'Buscó a Pablo en la cárcel de Roma y lo confortó.', 'No tuvo vergüenza de las cadenas.'),
            createWord('Filemón', 'Filemón 1', 'Rico cristiano de Colosas, Pablo le pidió recibir a Onésimo como hermano.', 'Tenía un esclavo fugitivo.'),
            createWord('Onésimo', 'Filemón 1:11', 'Esclavo fugitivo que conoció a Pablo en prisión y se convirtió.', 'Era "inútil" pero se volvió "útil".'),
            createWord('Epafrodito', 'Filipenses 2:25-27', 'Enviado de los filipenses para cuidar a Pablo, enfermó gravemente.', 'Casi muere por la obra.'),
            createWord('Lucas', 'Colosenses 4:14', 'Compañero de viajes de Pablo, escribió el Evangelio y Hechos.', 'Era médico.'),
            createWord('Marcos (Juan Marcos)', 'Hechos 13:13', 'Sobrino de Bernabé, luego fue útil y escribió un evangelio.', 'Abandonó el viaje a la mitad.'),
            createWord('Jasón', 'Hechos 17:5-9', 'Hospedó a Pablo en Tesalónica y su casa fue atacada.', 'Pagó fianza por los apóstoles.'),
            createWord('Dionisio el Areopagita', 'Hechos 17:34', 'Creyó en Jesús tras el discurso de Pablo en Atenas.', 'Era un juez griego.'),
            createWord('Epafras', 'Colosenses 4:12', 'Fundador de la iglesia en Colosas.', 'Oraba intensamente por su ciudad.'),
            createWord('Gayo', '3 Juan 1', 'Destinatario de 3ra de Juan, andaba en la verdad.', 'Amado por su hospitalidad.')
        ]
    },
    profetas_conocidos: {
        id: 'profetas_conocidos', name: 'Profetas Conocidos', type: 'personajes', words: [
            createWord('Isaías', 'Is 1:1', 'Profetizó sobre el Mesías sufriente y la virgen que concebiría.', 'Escribió un libro muy largo.'),
            createWord('Jeremías', 'Jer 1:1', 'Conocido como el "profeta llorón", predicó al reino del Sur antes del exilio.', 'Pasó momentos muy tristes.'),
            createWord('Ezequiel', 'Ez 1:1', 'Vio el valle de los huesos secos y la rueda dentro de la rueda.', 'Tuvo visiones muy locas.'),
            createWord('Daniel', 'Dan 1:1', 'Interpretó sueños de Nabucodonosor y sobrevivió al foso de los leones.', 'Trabajó para el gobierno.'),
            createWord('Jonás', 'Jon 1:1', 'Fue tragado por un gran pez por huir de Nínive.', 'No quería ir a trabajar.'),
            createWord('Elías', '1 Re 17:1', 'Fue arrebatado en un carro de fuego y desafió a los profetas de Baal.', 'Hizo caer cosas del cielo.'),
            createWord('Eliseo', '2 Re 2:9', 'Pidió la doble porción del espíritu de su maestro e hizo flotar un hacha.', 'Recibió una herencia espiritual.'),
            createWord('Samuel', '1 Sam 3:4', 'Ungió a los dos primeros reyes de Israel (Saúl y David).', 'Lo llamaron de chico.'),
            createWord('Moisés', 'Dt 34:10', 'Considerado profeta, sacó al pueblo de Egipto y recibió la Ley.', 'Lideró mucha gente.'),
            createWord('Juan el Bautista', 'Mt 3:1', 'Comía langostas y preparó el camino para Jesús.', 'Vivía en el desierto.'),
            createWord('Oseas', 'Os 1:2', 'Dios le mandó casarse con una prostituta para simbolizar la infidelidad de Israel.', 'Tuvo problemas matrimoniales.'),
            createWord('Amós', 'Am 7:14', 'Era boyero y recolector de higos antes de profetizar juicio sobre Israel.', 'Trabajaba en el campo.'),
            createWord('Miqueas', 'Miq 5:2', 'Profetizó que el Mesías nacería en Belén.', 'Habló de un pueblo pequeño.'),
            createWord('Malaquías', 'Mal 3:10', 'El último profeta del AT, famoso por el pasaje de los diezmos.', 'Habló de dinero.'),
            createWord('Joel', 'Jl 2:28', 'Profetizó sobre la plaga de langostas y el derramamiento del Espíritu Santo.', 'Habló de una plaga.'),
            createWord('Habacuc', 'Hab 2:4', 'Le preguntó a Dios "¿hasta cuándo?" y dijo que el justo vivirá por la fe.', 'Se quejó con Dios.'),
            createWord('Zacarías', 'Zac 9:9', 'Profetizó la entrada triunfal de Jesús en un asno.', 'Tuvo muchas visiones nocturnas.'),
            createWord('Hageo', 'Hag 1:4', 'Animó al pueblo a reconstruir el Templo en lugar de sus propias casas.', 'Quería que construyeran algo.'),
            createWord('Nahúm', 'Nah 1:1', 'Profetizó la destrucción definitiva de Nínive (lo opuesto a Jonás).', 'Tenía malas noticias para una ciudad.'),
            createWord('Balaam', 'Num 22:28', 'Su burra le habló; intentó maldecir a Israel pero solo pudo bendecirlo.', 'Tuvo un problema con su transporte.')
        ]
    },
    profetas_otros: {
        id: 'profetas_otros', name: 'Otros Profetas', type: 'personajes', words: [
            createWord('Agabo', 'Hch 21:10', 'Profeta del NT que ató el cinto de Pablo y predijo una gran hambruna.', 'Predijo algo malo en el futuro.'),
            createWord('Natán', '2 Sam 12:1', 'Confrontó a David por su pecado con Betsabé.', 'Contó una historia sobre ovejas.'),
            createWord('Ahías', '1 Re 11:30', 'Rompió su capa en 12 pedazos para profetizar la división del reino a Jeroboam.', 'Rompió ropa.'),
            createWord('Micaías', '1 Re 22:14', 'Profetizó la derrota de Acab cuando 400 falsos profetas decían que ganaría.', 'Dijo la verdad aunque doliera.'),
            createWord('Hulda', '2 Re 22:14', 'Profetisa consultada por el rey Josías cuando encontraron el Libro de la Ley.', 'Una mujer consultada por el rey.'),
            createWord('Gad', '2 Sam 24:11', 'Vidente de David, le dio a elegir tres castigos tras el censo.', 'Aconseja al rey en el bosque.'),
            createWord('Iddo', '2 Cr 9:29', 'Vidente mencionado en Crónicas, escribió sobre el reinado de Salomón.', 'Escribió crónicas perdidas.'),
            createWord('Semaías', '1 Re 12:22', 'Le dijo al rey Roboam que no peleara contra las diez tribus del norte.', 'Detuvo una guerra civil.'),
            createWord('Hanani', '2 Cr 16:7', 'Vidente encarcelado por el rey Asa por reprender su alianza con Siria.', 'Fue a la cárcel por hablar.'),
            createWord('Jehú (hijo de Hanani)', '1 Re 16:1', 'Profetizó contra el rey Baasa de Israel.', 'No es el rey que maneja rápido.'),
            createWord('Eliezer', '2 Cr 20:37', 'Profetizó que las naves de Josafat se destruirían por aliarse con Ocozías.', 'Habló de barcos rotos.'),
            createWord('Jahaziel', '2 Cr 20:14', 'El Espíritu vino sobre él y dijo: "No es vuestra la guerra, sino de Dios".', 'Habló en medio de una reunión.'),
            createWord('Oded', '2 Cr 28:9', 'Convenció al ejército de Israel de liberar a los cautivos de Judá.', 'Regañó a un ejército victorioso.'),
            createWord('Azarías', '2 Cr 15:1', 'Le dijo al rey Asa: "Dios estará con vosotros si vosotros estáis con él".', 'Animó a un rey a hacer reformas.'),
            createWord('Urías', 'Jer 26:20', 'Profeta contemporáneo de Jeremías, el rey Joacim lo mandó a buscar para matarlo.', 'Huyó a Egipto y lo mataron.'),
            createWord('Noadías', 'Neh 6:14', 'Falsa profetisa que intentó intimidar a Nehemías.', 'Estaba en contra de la construcción.'),
            createWord('El varón de Dios', '1 Re 13:24', 'Profetizó contra el altar de Betel, pero un viejo profeta lo engañó y murió.', 'Le comió un león.'),
            createWord('Zacarías (hijo de Joiada)', '2 Cr 24:20', 'Fue apedreado por orden del rey Joás por reprender al pueblo.', 'Murió en el patio del templo.'),
            createWord('Ana', 'Lc 2:36', 'Profetisa anciana que vio a Jesús bebé en la presentación en el Templo.', 'Vivía en el templo.'),
            createWord('Silas', 'Hch 15:32', 'Llamado profeta en Hechos, compañero de Pablo en la cárcel de Filipos.', 'Viajaba con un apóstol.')
        ]
    },
    reyes_israel: {
        id: 'reyes_israel', name: 'Reyes de Israel/Judá', type: 'personajes', words: [
            createWord('David', '2 Sam 5:4', 'Rey conforme al corazón de Dios, mató a Goliat.', 'Tocaba el arpa.'),
            createWord('Salomón', '1 Re 3:12', 'El rey más sabio y rico, construyó el Templo.', 'Tuvo muchas esposas.'),
            createWord('Saúl', '1 Sam 10:1', 'El primer rey de Israel, alto y hermoso, pero desobediente.', 'Se escondió entre el equipaje.'),
            createWord('Josías', '2 Re 22:1', 'Rey niño que reformó Judá e hizo un gran pacto tras hallar la Ley.', 'Empezó a reinar a los 8 años.'),
            createWord('Ezequías', '2 Re 18:5', 'Confió en Jehová, oró y el ángel mató a 185,000 asirios.', 'Mostró sus tesoros a los babilonios.'),
            createWord('Acab', '1 Re 16:30', 'Rey malvado de Israel, esposo de Jezabel, adorador de Baal.', 'Quería una viña ajena.'),
            createWord('Manasés', '2 Re 21:16', 'Rey muy malo que se arrepintió en la cárcel en Babilonia.', 'Llenó Jerusalén de sangre.'),
            createWord('Jehu', '2 Re 9:20', 'Rey que manejaba locamente y destruyó el culto a Baal.', 'Manejaba muy rápido.'),
            createWord('Jeroboam I', '1 Re 12:28', 'Hizo dos becerros de oro para que el pueblo no fuera a Jerusalén.', 'Dividió el reino.'),
            createWord('Roboam', '1 Re 12:13', 'Hijo de Salomón, sus malos consejos dividieron el reino.', 'Escuchó a los jóvenes.'),
            createWord('Ocozías', '2 Re 1:2', 'Cayó por una ventana y consultó a Baal-zebub.', 'Se cayó de un piso alto.'),
            createWord('Uzías', '2 Cr 26:19', 'Rey leproso por intentar ofrecer incienso en el templo.', 'Le salió lepra en la frente.'),
            createWord('Joás', '2 Re 11:12', 'Rey oculto en el templo por 6 años, comenzó bien y terminó mal.', 'Su tía lo escondió.'),
            createWord('Asa', '2 Cr 14:11', 'Rey que quitó la idolatría pero al final confió en los médicos y no en Dios.', 'Tenía enfermos los pies.'),
            createWord('Josafat', '2 Cr 20:20', 'Ganó una batalla con cantores al frente del ejército.', 'Puso cantantes al frente.'),
            createWord('Sedequías', 'Jer 52:11', 'Último rey de Judá, le sacaron los ojos y lo llevaron a Babilonia.', 'Vio morir a sus hijos.'),
            createWord('Joacim', 'Jer 36:23', 'Quemó el rollo del libro de Jeremías en el fuego.', 'Cortó la Biblia con un cortaplumas.'),
            createWord('Omri', '1 Re 16:24', 'Compró el monte de Samaria y edificó la ciudad.', 'Fundó una capital.'),
            createWord('Jericó', 'Jos 6:1', 'Rey derrotado cuando cayeron los muros (no se nombra, pero representa a los reyes cananeos).', 'Su ciudad cayó por gritos.'),
            createWord('Abimelec', 'Jue 9:5', 'Hijo de Gedeón, mató a sus 70 hermanos para ser rey.', 'Murió por una piedra de molino.')
        ]
    },
    patriarcas: {
        id: 'patriarcas', name: 'Patriarcas', type: 'personajes', words: [
            createWord('Abraham', 'Gen 12:1', 'Padre de la fe, salió de Ur sin saber a dónde iba.', 'Tuvo un hijo en la vejez.'),
            createWord('Isaac', 'Gen 22:9', 'Hijo de la promesa, casi sacrificado por su padre.', 'Le gustaba el guiso de caza.'),
            createWord('Jacob', 'Gen 27:19', 'Engañó a su hermano y luchó con el ángel.', 'Usó piel de cabrito.'),
            createWord('José', 'Gen 37:3', 'El soñador, vendido por sus hermanos, gobernador de Egipto.', 'Tenía una túnica de colores.'),
            createWord('Noé', 'Gen 6:14', 'Construyó el arca y salvó a su familia del diluvio.', 'Hizo un barco grande.'),
            createWord('Job', 'Job 1:1', 'Hombre paciente que sufrió mucho pero Dios lo restauró.', 'Tenía sarna y rascaba con teja.'),
            createWord('Matusalén', 'Gen 5:27', 'El hombre más viejo de la Biblia (969 años).', 'Vivió casi mil años.'),
            createWord('Enoc', 'Gen 5:24', 'Caminó con Dios y desapareció porque Dios se lo llevó.', 'No vio muerte.'),
            createWord('Adán', 'Gen 2:7', 'El primer hombre, formado del polvo.', 'Puso nombre a los animales.'),
            createWord('Set', 'Gen 4:25', 'Hijo de Adán dado en lugar de Abel.', 'Tercer hijo mencionado.'),
            createWord('Sem', 'Gen 9:26', 'Hijo de Noé, antepasado de Abraham.', 'Cubrió la desnudez de su padre.'),
            createWord('Cam', 'Gen 9:22', 'Hijo de Noé que vio la desnudez de su padre.', 'Padre de Canaán.'),
            createWord('Jafet', 'Gen 10:2', 'Hijo de Noé, se expandió por las costas.', 'El tercer hermano del barco.'),
            createWord('Lot', 'Gen 19:15', 'Sobrino de Abraham, escapó de Sodoma.', 'Su esposa es de sal.'),
            createWord('Ismael', 'Gen 16:15', 'Primer hijo de Abraham (con Agar), padre de los árabes.', 'Hijo de la sierva.'),
            createWord('Esaú', 'Gen 25:30', 'Vendió su primogenitura por un plato de lentejas.', 'Era muy velludo.'),
            createWord('Labán', 'Gen 29:16', 'Tío de Jacob, le cambió el salario 10 veces.', 'Tenía dos hijas para casar.'),
            createWord('Judá', 'Gen 49:10', 'Hijo de Jacob, antepasado del Mesías (el León).', 'Sugirió vender a José.'),
            createWord('Benjamín', 'Gen 42:4', 'El hijo menor de Jacob, amado por su padre.', 'En su saco estaba la copa.'),
            createWord('Rubén', 'Gen 37:21', 'Primogénito de Jacob, quiso salvar a José.', 'Perdió su derecho por subir al lecho.')
        ]
    },
    mujeres: {
        id: 'mujeres', name: 'Mujeres Bíblicas', type: 'personajes', words: [
            createWord('Eva', 'Gen 3:6', 'La primera mujer, madre de todos los vivientes.', 'Comió la fruta prohibida.'),
            createWord('Sara', 'Gen 17:15', 'Esposa de Abraham, madre de Isaac en la vejez.', 'Se rió de la promesa.'),
            createWord('Rebeca', 'Gen 24:19', 'Esposa de Isaac, ayudó a Jacob a engañar a su padre.', 'Dio agua a los camellos.'),
            createWord('Raquel', 'Gen 29:17', 'La esposa amada de Jacob, madre de José y Benjamín.', 'Robó los ídolos de su padre.'),
            createWord('Lea', 'Gen 29:17', 'Primera esposa de Jacob, de ojos delicados, madre de Judá.', 'La que no era tan bonita.'),
            createWord('Débora', 'Jue 4:4', 'Jueza y profetisa que lideró a Israel a la victoria.', 'Se sentaba bajo una palmera.'),
            createWord('Rut', 'Rut 1:16', 'Moabita fiel que siguió a Noemí: "Tu pueblo será mi pueblo".', 'Espigaba en los campos.'),
            createWord('Ester', 'Ester 4:16', 'Reina persa que salvó a su pueblo: "Si perezco, que perezca".', 'Ganó un concurso de belleza.'),
            createWord('María (Madre de Jesús)', 'Lc 1:38', 'Joven virgen elegida para dar a luz al Salvador.', 'Dijo: "Hágase en mí tu voluntad".'),
            createWord('María Magdalena', 'Lc 8:2', 'Jesús echó de ella 7 demonios, primera en ver al resucitado.', 'Llevó perfumes a la tumba.'),
            createWord('Marta', 'Lc 10:40', 'Hermana de Lázaro, afanada con los quehaceres.', 'Reclamó que no le ayudaban.'),
            createWord('María (Hermana de Lázaro)', 'Lc 10:39', 'Escogió la buena parte sentándose a los pies de Jesús.', 'Derramó perfume caro.'),
            createWord('Ana (Madre de Samuel)', '1 Sam 1:28', 'Oró con amargura por un hijo y lo entregó a Dios.', 'El sacerdote pensó que estaba ebria.'),
            createWord('Abigail', '1 Sam 25:3', 'Mujer sabia que evitó que David matara a su esposo Nabal.', 'Llevó comida en asnos.'),
            createWord('Rahab', 'Jos 2:1', 'Prostituta de Jericó que escondió a los espías.', 'Colgó un cordón rojo.'),
            createWord('Dalila', 'Jue 16:18', 'Descubrió el secreto de la fuerza de Sansón y lo traicionó.', 'Le cortó el pelo al novio.'),
            createWord('Jezabel', '1 Re 21:23', 'Reina malvada que mataba profetas y murió comida por perros.', 'Se pintaba los ojos.'),
            createWord('La mujer samaritana', 'Jn 4:7', 'Habló con Jesús en el pozo y trajo a su ciudad a verlo.', 'Tuvo cinco maridos.'),
            createWord('Priscila', 'Hch 18:26', 'Esposa de Aquila, maestra de Apolos y colaboradora de Pablo.', 'Fabricaba carpas con su esposo.'),
            createWord('Miriam', 'Ex 15:20', 'Hermana de Moisés, tocó el pandero tras cruzar el Mar Rojo.', 'Se puso leprosa por criticar.')
        ]
    },
    lugares: {
        id: 'lugares', name: 'Lugares Bíblicos', type: 'lugares', words: [
            createWord('Jerusalén', 'Salmos 122:6', 'Ciudad de paz, capital de David, sitio del Templo.', 'Ciudad santa.'),
            createWord('Belén', 'Miqueas 5:2', 'Pequeña aldea de Judá donde nació el Mesías.', 'Casa de pan.'),
            createWord('Nazaret', 'Juan 1:46', 'Aldea de Galilea, hogar de la infancia de Jesús.', '¿Puede salir algo bueno de ahí?'),
            createWord('Río Jordán', 'Mateo 3:13', 'Lugar de bautismo y frontera de la tierra prometida.', 'Naamán se lavó ahí.'),
            createWord('Mar de Galilea', 'Mateo 4:18', 'Lago donde Jesús caminó sobre las aguas y llamó pescadores.', 'Lugar de tormentas y pesca.'),
            createWord('Monte Sinaí', 'Éxodo 19:18', 'Montaña donde Dios entregó la Ley entre fuego y humo.', 'Monte de los mandamientos.'),
            createWord('Jericó', 'Josué 6:20', 'Ciudad de las palmeras, sus muros cayeron por la fe.', 'Primera ciudad conquistada.'),
            createWord('Egipto', 'Éxodo 1:11', 'Lugar de refugio para Jesús y esclavitud para Israel.', 'Tierra de pirámides y faraones.'),
            createWord('Babilonia', 'Daniel 1:1', 'Gran imperio que llevó cautivo a Judá, ciudad de la torre.', 'Lugar de confusión y exilio.'),
            createWord('Getsemaní', 'Mateo 26:36', 'Huerto de los olivos donde Jesús oró en agonía.', 'Prensa de aceite.'),
            createWord('Gólgota', 'Mateo 27:33', 'Lugar de la Calavera, sitio de la crucifixión.', 'Monte de la muerte.'),
            createWord('El Edén', 'Génesis 2:8', 'Huerto perfecto creado por Dios para el hombre.', 'El paraíso perdido.'),
            createWord('Sodoma', 'Génesis 19:24', 'Ciudad destruida por fuego y azufre por su maldad.', 'Ciudad del pecado.'),
            createWord('Nínive', 'Jonás 3:3', 'Gran ciudad asiria que se arrepintió con la predicación de Jonás.', 'Ciudad de enemigos perdonados.'),
            createWord('Betania', 'Juan 11:1', 'Aldea de Lázaro, Marta y María, cerca de Jerusalén.', 'Donde vivían los amigos de Jesús.'),
            createWord('Monte Carmelo', '1 Reyes 18:19', 'Lugar del desafío de Elías contra los profetas de Baal.', 'Monte del fuego.'),
            createWord('Camino a Emaús', 'Lucas 24:13', 'Ruta donde Jesús se apareció a dos discípulos tras resucitar.', 'Caminata de revelación.'),
            createWord('Ur de los caldeos', 'Génesis 11:31', 'Ciudad natal de Abraham de la cual salió.', 'Punto de partida del patriarca.'),
            createWord('Monte de los Olivos', 'Hechos 1:12', 'Sitio de la ascensión de Jesús y su regreso futuro.', 'Monte frente al templo.'),
            createWord('La tumba vacía', 'Juan 20:1', 'Sepulcro nuevo de José de Arimatea, hallado sin cuerpo.', 'Lugar de resurrección.')
        ]
    },
    lugares_dificiles: {
        id: 'lugares_dificiles', name: 'Lugares (Difícil)', type: 'lugares', words: [
            createWord('Patmos', 'Apocalipsis 1:9', 'Isla rocosa donde Juan recibió la revelación.', 'Isla prisión.'),
            createWord('Antioquía', 'Hechos 11:26', 'Ciudad donde se llamó "cristianos" por primera vez a los discípulos.', 'Base de misiones de Pablo.'),
            createWord('Tarso', 'Hechos 22:3', 'Ciudad culta de Cilicia, lugar de nacimiento de Pablo.', 'Ciudad de ciudadanía romana.'),
            createWord('Monte Tabor', 'Jueces 4:6', 'Monte alto, tradicional sitio de la Transfiguración.', 'Monte de la gloria.'),
            createWord('Monte Nebo', 'Deuteronomio 34:1', 'Desde aquí Moisés vio la Tierra Prometida antes de morir.', 'Mirador final de Moisés.'),
            createWord('Susa', 'Ester 1:2', 'Capital de invierno de Persia, escenario del libro de Ester.', 'Ciudad del palacio real persa.'),
            createWord('Corinto', 'Hechos 18:1', 'Ciudad griega famosa por su comercio y su inmoralidad.', 'Ciudad de dos cartas de Pablo.'),
            createWord('Tesalónica', 'Hechos 17:1', 'Ciudad macedonia donde Pablo predicó y fue perseguido.', 'Recibió dos cartas sobre el fin.'),
            createWord('Filipos', 'Hechos 16:12', 'Colonia romana donde encarcelaron a Pablo y Silas.', 'Ciudad del carcelero convertido.'),
            createWord('Éfeso', 'Hechos 19:1', 'Ciudad de Artemisa, Pablo pasó 3 años allí.', 'Ciudad del gran teatro.'),
            createWord('Ararat', 'Génesis 8:4', 'Montes donde se posó el arca de Noé.', 'Estacionamiento del barco.'),
            createWord('Madián', 'Éxodo 2:15', 'Tierra donde Moisés huyó y vivió 40 años pastoreando.', 'Tierra del suegro de Moisés.'),
            createWord('Hebrón', '2 Samuel 2:11', 'Primera capital de David antes de Jerusalén.', 'Ciudad de los patriarcas.'),
            createWord('Betel', 'Génesis 28:19', 'Lugar donde Jacob soñó con la escalera al cielo.', 'Casa de Dios.'),
            createWord('Silo', '1 Samuel 1:3', 'Donde estaba el Tabernáculo antes de Jerusalén, y Samuel servía.', 'Primer santuario fijo.'),
            createWord('Gilgal', 'Josué 5:9', 'Primer campamento de Israel en Canaán, lugar de la circuncisión.', 'Donde rodó el oprobio.'),
            createWord('Sunem', '2 Reyes 4:8', 'Pueblo de la mujer rica que hospedó a Eliseo.', 'Lugar de la mujer hospitalaria.'),
            createWord('Endor', '1 Samuel 28:7', 'Lugar de la adivina consultada por Saúl.', 'Sitio de espiritismo.'),
            createWord('Monte Hermón', 'Salmos 133:3', 'Monte alto del norte, famoso por su rocío.', 'Monte de nieve.'),
            createWord('Rio Éufrates', 'Génesis 2:14', 'Gran río de Mesopotamia, uno de los 4 del Edén.', 'El gran río del oriente.')
        ]
    },
    milagros: {
        id: 'milagros', name: 'Milagros y Eventos', type: 'eventos', words: [
            createWord('La Creación', 'Génesis 1:1', 'Dios creó los cielos y la tierra en 6 días.', 'El inicio de todo.'),
            createWord('El Diluvio', 'Génesis 7:17', 'Lluvia por 40 días, cubrió los montes más altos.', 'Mucha agua y un barco.'),
            createWord('La Zarza Ardiendo', 'Éxodo 3:2', 'Arbusto que ardía sin consumirse, Dios habló a Moisés.', 'Fuego que no quema.'),
            createWord('Las 10 Plagas', 'Éxodo 7-12', 'Juicios sobre Egipto: sangre, ranas, langostas, etc.', 'Desastres naturales sobrenaturales.'),
            createWord('Cruce del Mar Rojo', 'Éxodo 14:21', 'Las aguas se abrieron para que Israel pasara en seco.', 'Un camino en el mar.'),
            createWord('Maná del cielo', 'Éxodo 16:15', 'Pan que caía cada mañana para alimentar al pueblo.', 'Comida blanca y dulce.'),
            createWord('Muros de Jericó', 'Josué 6:20', 'Cayeron tras rodear la ciudad y gritar.', 'Derrumbe por sonido.'),
            createWord('El Sol se detuvo', 'Josué 10:13', 'El día se alargó para que Josué ganara la batalla.', 'Un día muy largo.'),
            createWord('Fuego en el Carmelo', '1 Reyes 18:38', 'Fuego consumió el sacrificio empapado de Elías.', 'Respuesta ardiente del cielo.'),
            createWord('Horno de Fuego', 'Daniel 3:25', 'Sadrac, Mesac y Abed-nego no se quemaron.', 'Paseo en el fuego con un cuarto hombre.'),
            createWord('Daniel en los leones', 'Daniel 6:22', 'Los ángeles cerraron la boca de las fieras.', 'Noche tranquila en el zoológico.'),
            createWord('Jonás y el pez', 'Jonás 1:17', 'Tragado y vomitado vivo tres días después.', 'Submarino biológico.'),
            createWord('Agua en Vino', 'Juan 2:9', 'Primer milagro de Jesús en una boda en Caná.', 'La mejor bebida al final.'),
            createWord('Multiplicación Panes', 'Mateo 14:19', '5 panes y 2 peces alimentaron a 5000.', 'Picnic gigante con poca comida.'),
            createWord('Caminar sobre agua', 'Mateo 14:25', 'Jesús anduvo sobre el mar en la tormenta.', 'Surf sin tabla.'),
            createWord('Resurrección de Lázaro', 'Juan 11:43', 'Salió de la tumba tras 4 días muerto.', 'Un muerto que camina.'),
            createWord('Sanidad del ciego', 'Juan 9:6', 'Jesús hizo lodo con saliva y untó sus ojos.', 'Barro medicinal.'),
            createWord('Pesca Milagrosa', 'Lucas 5:6', 'Las redes se rompían de tantos peces.', 'El barco casi se hunde de peces.'),
            createWord('Ascensión de Jesús', 'Hechos 1:9', 'Subió al cielo en una nube.', 'Despegue vertical.'),
            createWord('Pentecostés', 'Hechos 2:2', 'Vino el Espíritu Santo con lenguas de fuego.', 'Viento y fuego en la casa.')
        ]
    },
    acciones: {
        id: 'acciones', name: 'Acciones Bíblicas', type: 'eventos', words: [
            createWord('Orar', '1 Tesalonicenses 5:17', 'Hablar con Dios.', 'Hablar sin mover los labios (a veces).'),
            createWord('Ayunar', 'Mateo 6:16', 'Abstenerse de comida para buscar a Dios.', 'Dejar de comer por fe.'),
            createWord('Bautizar', 'Mateo 28:19', 'Sumergir en agua en el nombre de la Trinidad.', 'Mojarse por completo.'),
            createWord('Predicar', 'Marcos 16:15', 'Anunciar las buenas nuevas.', 'Hablar en público de Dios.'),
            createWord('Adorar', 'Juan 4:24', 'Rendir culto a Dios en espíritu y verdad.', 'Cantar o postrarse.'),
            createWord('Ofrendar', '2 Corintios 9:7', 'Dar dinero o bienes para la obra de Dios.', 'Poner dinero en el plato.'),
            createWord('Perdonar', 'Mateo 6:14', 'Soltar la ofensa contra otro.', 'Olvidar el daño recibido.'),
            createWord('Servir', 'Mateo 20:28', 'Ayudar a otros como Jesús lo hizo.', 'Hacer cosas por los demás.'),
            createWord('Evangelizar', 'Hechos 1:8', 'Compartir a Cristo con los perdidos.', 'Contar las buenas noticias.'),
            createWord('Profetizar', '1 Corintios 14:3', 'Hablar de parte de Dios para edificación.', 'Hablar futuro o consuelo.'),
            createWord('Ungir', 'Santiago 5:14', 'Aplicar aceite sobre alguien orando.', 'Poner aceite en la cabeza.'),
            createWord('Cenar (Santa Cena)', '1 Corintios 11:24', 'Comer pan y beber vino en memoria de Jesús.', 'Comer un pedacito de pan.'),
            createWord('Confesar', '1 Juan 1:9', 'Declarar los pecados a Dios.', 'Decir lo malo que hiciste.'),
            createWord('Diezmar', 'Malaquías 3:10', 'Dar el 10% de los ingresos.', 'Dar la décima parte.'),
            createWord('Sanar', 'Marcos 16:18', 'Restaurar la salud por poder divino.', 'Curar sin medicina.'),
            createWord('Discipular', 'Mateo 28:19', 'Enseñar a otros a seguir a Jesús.', 'Enseñar a un aprendiz.'),
            createWord('Interceder', '1 Timoteo 2:1', 'Orar a favor de otra persona.', 'Pedir por otro.'),
            createWord('Bendecir', 'Números 6:24', 'Desear o declarar el bien sobre alguien.', 'Decir cosas buenas.'),
            createWord('Arrepentirse', 'Hechos 3:19', 'Cambiar de mente y volverse a Dios.', 'Dar media vuelta en la vida.'),
            createWord('Congregarse', 'Hebreos 10:25', 'Reunirse con otros creyentes.', 'Ir a la iglesia.')
        ]
    },
    libros: {
        id: 'libros', name: 'Libros de la Biblia', type: 'cultura', words: [
            createWord('Génesis', 'Gen 1:1', 'El libro de los orígenes.', 'Primer libro.'),
            createWord('Salmos', 'Sal 23:1', 'Libro de canciones y oraciones poéticas.', 'Está en el medio de la Biblia.'),
            createWord('Apocalipsis', 'Ap 1:1', 'Profecía sobre el fin de los tiempos.', 'Último libro.'),
            createWord('Romanos', 'Rom 1:16', 'Carta doctrinal de Pablo sobre la justificación.', 'Carta a la capital del imperio.'),
            createWord('Proverbios', 'Prov 1:7', 'Colección de dichos sabios de Salomón.', 'Libro de sabiduría práctica.'),
            createWord('Mateo', 'Mt 1:1', 'Primer evangelio, dirigido a los judíos.', 'Escrito por un ex recaudador.'),
            createWord('Hechos', 'Hch 1:8', 'Historia de la iglesia primitiva y los apóstoles.', 'Libro de acción y viajes.'),
            createWord('Éxodo', 'Ex 1:1', 'Narra la salida de Egipto y la entrega de la Ley.', 'Libro de la liberación.'),
            createWord('Isaías', 'Is 53:5', 'El profeta mesiánico por excelencia.', 'Libro largo con muchas profecías.'),
            createWord('Job', 'Job 1:21', 'Trata sobre el sufrimiento del justo.', 'Libro muy antiguo y filosófico.'),
            createWord('Eclesiastés', 'Ecl 1:2', 'Todo es vanidad bajo el sol.', 'Escrito por un rey deprimido (aparentemente).'),
            createWord('Cantares', 'Cant 2:16', 'Poema de amor entre el amado y la amada.', 'Libro romántico.'),
            createWord('Levítico', 'Lev 19:18', 'Leyes sobre sacrificios y santidad.', 'Libro de reglas para sacerdotes.'),
            createWord('Jonás', 'Jon 1:17', 'Historia de un profeta rebelde y un gran pez.', 'Libro corto con un animal grande.'),
            createWord('Rut', 'Rut 1:16', 'Historia de amor y redención en los campos de Belén.', 'Libro con nombre de mujer.'),
            createWord('Ester', 'Ester 4:14', 'La providencia de Dios salva a los judíos en Persia.', 'Libro donde no se nombra a Dios.'),
            createWord('Daniel', 'Dan 6:22', 'Historias de fe en Babilonia y profecías.', 'Libro con leones y estatuas.'),
            createWord('Hebreos', 'Heb 11:1', 'Muestra la superioridad de Cristo sobre el antiguo pacto.', 'Carta a los judíos cristianos.'),
            createWord('Santiago', 'Stg 2:17', 'La fe sin obras es muerta.', 'Carta muy práctica y directa.'),
            createWord('1 Corintios', '1 Cor 13:13', 'Carta sobre problemas en la iglesia y el amor.', 'Carta del amor.')
        ]
    },
    frases: {
        id: 'frases', name: 'Frases Bíblicas', type: 'cultura', words: [
            createWord('El Señor es mi pastor', 'Salmos 23:1', 'Nada me faltará.', 'Frase de funerales y consuelo.'),
            createWord('Todo lo puedo en Cristo', 'Filipenses 4:13', 'Que me fortalece.', 'Frase de atletas y superación.'),
            createWord('En el principio', 'Génesis 1:1', 'Creó Dios los cielos y la tierra.', 'Las primeras palabras.'),
            createWord('No solo de pan vive el hombre', 'Mateo 4:4', 'Sino de toda palabra de Dios.', 'Respuesta a la tentación de comida.'),
            createWord('Sed santos', '1 Pedro 1:16', 'Porque yo soy santo.', 'Mandamiento de pureza.'),
            createWord('Y conoceréis la verdad', 'Juan 8:32', 'Y la verdad os hará libres.', 'Frase sobre libertad.'),
            createWord('De tal manera amó Dios', 'Juan 3:16', 'Que ha dado a su Hijo unigénito.', 'El versículo más famoso.'),
            createWord('Consumado es', 'Juan 19:30', 'Todo ha terminado.', 'Últimas palabras en la cruz.'),
            createWord('He peleado la buena batalla', '2 Timoteo 4:7', 'He acabado la carrera.', 'Palabras de despedida de Pablo.'),
            createWord('Varones de Galilea', 'Hechos 1:11', '¿Por qué estáis mirando al cielo?', 'Pregunta de los ángeles.'),
            createWord('Yo y mi casa', 'Josué 24:15', 'Serviremos a Jehová.', 'Lema familiar.'),
            createWord('Esforzaos y cobrad ánimo', 'Josué 1:9', 'No temas ni desmayes.', 'Consejo a un nuevo líder.'),
            createWord('El justo por la fe vivirá', 'Romanos 1:17', 'Base de la reforma protestante.', 'Frase repetida en el NT.'),
            createWord('Venga tu reino', 'Mateo 6:10', 'Hágase tu voluntad.', 'Parte del Padrenuestro.'),
            createWord('No temáis', 'Lucas 2:10', 'Frase muy repetida en la Biblia por ángeles y Dios.', 'Orden de no tener miedo.'),
            createWord('Amarás a tu prójimo', 'Levítico 19:18', 'Como a ti mismo.', 'La regla de oro.'),
            createWord('La mujer sabia', 'Proverbios 14:1', 'Edifica su casa.', 'Consejo para esposas.'),
            createWord('El principio de la sabiduría', 'Proverbios 1:7', 'Es el temor de Jehová.', 'Lema de los proverbios.'),
            createWord('Cordero de Dios', 'Juan 1:29', 'Que quita el pecado del mundo.', 'Título de Jesús.'),
            createWord('Yo soy el camino', 'Juan 14:6', 'Y la verdad y la vida.', 'Afirmación exclusiva de Jesús.')
        ]
    },
    teologia: {
        id: 'teologia', name: 'Conceptos Teológicos', type: 'cultura', words: [
            createWord('Trinidad', 'Mateo 28:19', 'Dios es uno en tres personas: Padre, Hijo, Espíritu.', 'Tres en uno.'),
            createWord('Gracia', 'Efesios 2:8', 'Regalo inmerecido de Dios para salvación.', 'Favor no ganado.'),
            createWord('Fe', 'Hebreos 11:1', 'Certeza de lo que se espera, convicción de lo que no se ve.', 'Creer sin ver.'),
            createWord('Pecado', 'Romanos 3:23', 'Transgresión de la ley de Dios, errar al blanco.', 'Hacer lo malo.'),
            createWord('Salvación', 'Hechos 4:12', 'Ser librado de la condenación eterna.', 'Rescate del infierno.'),
            createWord('Santificación', '1 Tesalonicenses 4:3', 'Proceso de ser hecho santo y apartado para Dios.', 'Limpiarse cada día.'),
            createWord('Justificación', 'Romanos 5:1', 'Ser declarado justo legalmente ante Dios.', 'Declarado inocente.'),
            createWord('Redención', 'Gálatas 3:13', 'Comprar de nuevo, liberar pagando un precio.', 'Pago de rescate.'),
            createWord('Arrepentimiento', 'Hechos 2:38', 'Cambio de mente y dirección hacia Dios.', 'Dar la vuelta en U.'),
            createWord('Bautismo', 'Romanos 6:4', 'Símbolo de muerte y resurrección con Cristo.', 'Mojarse en público.'),
            createWord('Unción', '1 Juan 2:20', 'Capacitación y poder del Espíritu Santo.', 'Aceite sagrado.'),
            createWord('Apologética', '1 Pedro 3:15', 'Defensa racional de la fe cristiana.', 'Defender lo que crees.'),
            createWord('Escatología', 'Mateo 24', 'Estudio de los eventos finales y el regreso de Cristo.', 'Estudio del fin del mundo.'),
            createWord('Evangelio', 'Marcos 1:1', 'Buenas noticias de salvación.', 'Buenas nuevas.'),
            createWord('Iglesia', 'Mateo 16:18', 'Cuerpo de Cristo, asamblea de los creyentes.', 'Edificio o gente.'),
            createWord('Soberanía', 'Salmos 115:3', 'Dios tiene control absoluto sobre todo.', 'Dios manda.'),
            createWord('Omnipresencia', 'Salmos 139:7', 'Dios está en todo lugar al mismo tiempo.', 'Estar en todas partes.'),
            createWord('Omnisciencia', 'Salmos 147:5', 'Dios lo sabe todo, pasado, presente y futuro.', 'Saberlo todo.'),
            createWord('Encarnación', 'Juan 1:14', 'Dios se hizo hombre en Jesús.', 'Dios con piel.'),
            createWord('Resurrección', '1 Corintios 15:20', 'Levantarse de los muertos con cuerpo glorificado.', 'Volver a la vida para siempre.')
        ]
    },
    historia: {
        id: 'historia', name: 'Historia de la Iglesia', type: 'cultura', words: [
            createWord('Martín Lutero', 'Alemania 1517', 'Inició la Reforma Protestante con sus 95 tesis.', 'El monje del martillo.'),
            createWord('Juan Calvino', 'Ginebra s.XVI', 'Reformador francés, escribió "La Institución".', 'Teólogo de la predestinación.'),
            createWord('John Wesley', 'Inglaterra s.XVIII', 'Fundador del Metodismo, evangelista a caballo.', 'El del "corazón ardiente".'),
            createWord('Charles Spurgeon', 'Londres s.XIX', 'El príncipe de los predicadores.', 'Fumaba puros y predicaba increíble.'),
            createWord('San Agustín', 'Hipona s.IV', 'Padre de la iglesia, escribió "Confesiones".', 'Hijo de Mónica.'),
            createWord('Constantino', 'Roma s.IV', 'Emperador que legalizó el cristianismo.', 'Vio una cruz en el cielo.'),
            createWord('William Tyndale', 'Inglaterra s.XVI', 'Tradujo la Biblia al inglés y fue martirizado.', 'Murió estrangulado por traducir.'),
            createWord('Billy Graham', 'EEUU s.XX', 'Evangelista que predicó a millones en estadios.', 'El pastor de los presidentes.'),
            createWord('Reforma Protestante', 'Europa s.XVI', 'Movimiento de retorno a la Biblia y separación de Roma.', 'Cisma con la iglesia católica.'),
            createWord('Gran Despertar', 'EEUU s.XVIII', 'Avivamientos masivos en las colonias americanas.', 'Mucha gente convirtiéndose.'),
            createWord('Mártires', 'Roma s.I-III', 'Cristianos muertos por su fe en el circo romano.', 'Comida de leones.'),
            createWord('Azusa Street', 'EEUU 1906', 'Avivamiento pentecostal en Los Ángeles.', 'Donde empezó el hablar en lenguas moderno.'),
            createWord('Concilio de Nicea', '325 d.C.', 'Reunión donde se definió la divinidad de Jesús.', 'Reunión de obispos antiguos.'),
            createWord('La Vulgata', 's.IV', 'Traducción de la Biblia al latín por Jerónimo.', 'Biblia en latín.'),
            createWord('Dietrich Bonhoeffer', 'Alemania s.XX', 'Pastor luterano ejecutado por conspirar contra Hitler.', 'Escribió "El costo del discipulado".'),
            createWord('Jim Elliot', 'Ecuador 1956', 'Misionero martirizado por los Huaorani.', 'Murió con una lanza.'),
            createWord('Francisco de Asís', 'Italia s.XII', 'Fundador de los franciscanos, amaba la pobreza.', 'Hablaba con pájaros.'),
            createWord('C.S. Lewis', 'Inglaterra s.XX', 'Apologista y autor de Narnia.', 'Escribió cuentos de leones y roperos.'),
            createWord('Jonathan Edwards', 'EEUU s.XVIII', 'Teólogo puritano: "Pecadores en manos de un Dios airado".', 'Predicador muy serio.'),
            createWord('George Müller', 'Inglaterra s.XIX', 'Fundó orfanatos confiando solo en la oración.', 'El hombre de fe y los huérfanos.')
        ]
    },
    musica: {
        id: 'musica', name: 'Música y Arte', type: 'cultura', words: [
            createWord('Hillsong', 'Australia', 'Banda de adoración global famosa por "Oceans".', 'Los australianos famosos.'),
            createWord('Marcos Witt', 'México', 'Pionero de la alabanza y adoración en español.', 'Cantó "Renuévame".'),
            createWord('Jesús Adrián Romero', 'México', 'Cantante de baladas cristianas con voz suave.', 'Cantó "Princesas Mágicas".'),
            createWord('Miel San Marcos', 'Guatemala', 'Banda de alabanza profética y júbilo.', 'Famosos por "No hay lugar más alto".'),
            createWord('Barak', 'Rep. Dominicana', 'Grupo de adoración conocido por "Ven Espíritu Santo".', 'Música de fuego.'),
            createWord('Redimi2', 'Rep. Dominicana', 'Rapero cristiano muy influyente.', 'El del "Trapstorno".'),
            createWord('Händel', 'El Mesías', 'Compuso el oratorio con el famoso "Aleluya".', 'Música clásica muy famosa.'),
            createWord('Tercer Cielo', 'Rep. Dominicana', 'Dúo pop romántico y cristiano.', 'Cantaron "Creeré".'),
            createWord('Lauren Daigle', 'EEUU', 'Cantante con voz potente estilo Adele.', 'Cantó "You Say".'),
            createWord('Coritos viejos', 'Tradición', 'Canciones cortas y alegres de escuela dominical.', 'Música de aplausos rápidos.'),
            createWord('Himnario', 'Tradición', 'Libro de canciones antiguas y doctrinales.', 'Libro de cánticos viejos.'),
            createWord('Danilo Montero', 'Costa Rica', 'Adorador y pastor en Lakewood.', 'Cantó "Cantaré de tu amor".'),
            createWord('Stryper', 'EEUU', 'Banda de metal cristiano de los 80s.', 'Tiraban Biblias al público.'),
            createWord('Kirk Franklin', 'EEUU', 'Director de coro gospel moderno.', 'Gospel con mucho ritmo.'),
            createWord('Marcos Barrientos', 'México', 'Líder de adoración enfocado en el Espíritu Santo.', 'Cantó "Sin Reservas".'),
            createWord('Christine DClario', 'EEUU/PR', 'Adoradora apasionada con voz potente.', 'Cantó "Como dijiste".'),
            createWord('Petra', 'EEUU', 'Banda pionera del rock cristiano.', 'Rock de los papás.'),
            createWord('Alex Campos', 'Colombia', 'Cantante de rock pop con voz peculiar.', 'Cantó "Al taller del maestro".'),
            createWord('La Última Cena (Da Vinci)', 'Arte', 'Pintura famosa de Jesús y los discípulos.', 'Cuadro muy famoso.'),
            createWord('David (Miguel Ángel)', 'Escultura', 'Estatua gigante del rey David en mármol.', 'Estatua desnuda famosa.')
        ]
    },
    objetos: {
        id: 'objetos', name: 'Objetos y Cosas', type: 'otros', words: [
            createWord('Arca de Noé', 'Génesis 6', 'Barco gigante para salvar animales.', 'Zoológico flotante.'),
            createWord('Arca del Pacto', 'Éxodo 25', 'Caja dorada con los 10 mandamientos.', 'Caja que mata si la tocas.'),
            createWord('Honda de David', '1 Samuel 17', 'Arma simple que mató a un gigante.', 'Tira piedras.'),
            createWord('Vara de Moisés', 'Éxodo 4', 'Se convertía en serpiente y abrió el mar.', 'Palo mágico de pastor.'),
            createWord('Manto de Elías', '2 Reyes 2', 'Golpeó el río Jordán y lo abrió.', 'Ropa que deja herencia.'),
            createWord('Túnica de José', 'Génesis 37', 'Ropa de muchos colores regalada por su papá.', 'Abrigo colorido.'),
            createWord('Tablas de la Ley', 'Éxodo 31', 'Piedras escritas por el dedo de Dios.', 'Piedras con reglas.'),
            createWord('Vellón de Gedeón', 'Jueces 6', 'Lana usada para pedir señal a Dios (seco/mojado).', 'Lana de oveja mojada.'),
            createWord('Quijada de asno', 'Jueces 15', 'Arma con la que Sansón mató a 1000 hombres.', 'Hueso de animal muerto.'),
            createWord('Pesebre', 'Lucas 2', 'Comedero de animales donde pusieron a Jesús.', 'Cuna humilde.'),
            createWord('Cruz', 'Mateo 27', 'Instrumento de tortura romano, símbolo de redención.', 'Dos maderos cruzados.'),
            createWord('Corona de espinas', 'Mateo 27', 'Burla de los soldados al Rey de los judíos.', 'Sombrero doloroso.'),
            createWord('Clavos', 'Juan 20', 'Sujetaron a Jesús en la cruz.', 'Metales puntiagudos.'),
            createWord('Lámpara de aceite', 'Mateo 25', 'Lo que llevaban las 10 vírgenes.', 'Luz antigua.'),
            createWord('Redes', 'Lucas 5', 'Herramienta de trabajo de Pedro y Andrés.', 'Para atrapar peces.'),
            createWord('Copa', 'Lucas 22', 'Usada en la última cena.', 'Vaso para vino.'),
            createWord('Pan', 'Juan 6', 'Alimento multiplicado y cuerpo de Cristo.', 'Comida básica.'),
            createWord('Incienso', 'Mateo 2', 'Regalo de los magos, aroma de oración.', 'Huele rico al quemarse.'),
            createWord('Monedas (30)', 'Mateo 26', 'Precio de la traición de Judas.', 'Dinero de sangre.'),
            createWord('Trompetas', 'Josué 6', 'Sonaron en Jericó y sonarán al final.', 'Instrumentos ruidosos.')
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

                            <div className="bg-slate-100 p-2 rounded-lg border border-slate-200 flex gap-2 items-center mb-4">
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
                )
                }

                {/* --- PANTALLA: ROLL ANIMATION --- */}
                {
                    gameState === 'rolling' && (
                        <div className="flex flex-col items-center justify-center min-h-[60vh] mt-12">
                            <div className="text-4xl animate-spin mb-4">🎲</div>
                            <h2 className="text-2xl font-black text-white mb-2">Sorteando Modo...</h2>
                            <div className="bg-white p-6 rounded-xl shadow-2xl scale-125 transition-all">
                                <div className="text-indigo-600 mb-2 flex justify-center">{GAME_MODES[vigiliaRollIndex].icon}</div>
                                <h3 className="text-xl font-bold text-slate-800 text-center">{GAME_MODES[vigiliaRollIndex].label}</h3>
                            </div>
                        </div>
                    )
                }

                {/* --- PANTALLA 2: REVELACIÓN --- */}
                {
                    gameState === 'reveal' && (
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
                    )
                }

                {/* --- PANTALLA 2.5: PREVIA --- */}
                {
                    gameState === 'pre-game' && (
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
                    )
                }

                {/* --- PANTALLA 3: JUGANDO --- */}
                {
                    gameState === 'playing' && (
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
                    )
                }

                {/* --- PANTALLA 4: VOTACIÓN --- */}
                {
                    gameState === 'vote' && (
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
                    )
                }

                {/* --- PANTALLA 5: RESULTADO RONDA (ARMAGEDÓN) --- */}
                {
                    gameState === 'round-result' && (
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
                    )
                }

                {/* --- PANTALLA 6: RESULTADO FINAL --- */}
                {
                    (gameState === 'result-faithful' || gameState === 'result-impostor') && (
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
                    )
                }

            </main >
        </div >
    );

}



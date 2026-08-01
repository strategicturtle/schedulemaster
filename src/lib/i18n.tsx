"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Lang = "en" | "es" | "fr" | "zh";

export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "zh", label: "中文" },
];

export const LOCALES: Record<Lang, string> = {
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  zh: "zh-CN",
};

type Dict = Record<string, string>;

// English is the source of truth; other languages fall back to it per-key.
const EN: Dict = {
  // Login
  "login.signin": "Sign in to your schedules",
  "login.signup": "Create your account",
  "login.username": "Username",
  "login.password": "Password",
  "login.wait": "Please wait…",
  "login.signupBtn": "Sign up",
  "login.loginBtn": "Log in",
  "login.haveAccount": "Already have an account?",
  "login.newHere": "New to ScheduleMaster?",
  "common.entered": "Entered {n} times",
  "lang.label": "Language",
  "weekStart.label": "Week starts on",
  "weekStart.starts": "Starts {day}",
  // Onboarding tour
  "tour.howto": "Tap “How to use” any time to learn ScheduleMaster.",
  "tour.new": "Tap + to create a brand-new schedule.",
  "tour.newFolder": "Make a folder to group your schedules.",
  "tour.folders": "Open Folders to filter by folder.",
  "tour.search": "Search your schedules by name here.",
  "tour.lang": "Change the app’s language here.",
  "tour.logout": "Log out of your account here.",
  "tour.quit": "Delete your account for good here.",
  "tour.next": "Next",
  "tour.skip": "Skip",
  "tour.done": "Got it!",
  // Lobby
  "lobby.signedInAs": "Signed in as {name}",
  "lobby.logout": "Log out",
  "lobby.quit": "Quit account",
  "lobby.search": "Search schedules…",
  "lobby.new": "New schedule",
  "lobby.howto": "How to use",
  "lobby.newFolder": "New folder",
  "lobby.folders": "Folders",
  "lobby.folderName": "Folder name",
  "lobby.add": "Add",
  "lobby.all": "All ({n})",
  "lobby.noFolders": "No folders yet — tap “New folder”.",
  "lobby.emptyNew": "No schedules yet. Tap + and let ScheduleManager build your week.",
  "lobby.emptyNoMatch": "No schedules match.",
  "lobby.noFolder": "No folder",
  "lobby.moveToFolder": "Move to folder",
  "lobby.rename": "Rename",
  "lobby.duplicate": "Duplicate",
  "pw.title": "Change password",
  "pw.current": "Current password",
  "pw.new": "New password",
  "pw.save": "Save",
  "pw.cancel": "Cancel",
  "pw.success": "Password changed.",
  "pw.show": "Show password",
  "pw.hide": "Hide password",
  "lobby.deleteSchedule": "Delete schedule",
  "lobby.deleteFolder": "Delete folder {name}",
  // Confirm quit
  "quit.title": "Are you sure?",
  "quit.body":
    "This permanently deletes your account and every schedule and folder in it. This can’t be undone.",
  "quit.cancel": "Cancel",
  "quit.confirm": "Yes, delete",
  // How to
  "howto.title": "How to use ScheduleMaster",
  "howto.s1": "Tap the + button to start a new schedule survey.",
  "howto.s2":
    "Fill in the blanks: fixed-time programs, flexible programs, and your wants. Use Tab to move between blanks.",
  "howto.s3": "Pick how busy you want your week, then press Done.",
  "howto.s4":
    "ScheduleManager builds your week — fixed items stay put, and it fits flexible items and wants into the best slots.",
  "howto.s5":
    "Back here in the lobby, search your schedules, rename them, and use folders to organize.",
  "howto.got": "Got it",
  // Survey
  "survey.subtitle": "New schedule survey",
  "survey.q": "Question {n} of {total}",
  "survey.fixed.title": "Any fixed-time programs?",
  "survey.flex.title": "Any programs without a fixed time?",
  "survey.wants.title": "Any wants?",
  "survey.seg.from": "from",
  "survey.seg.to": "to",
  "survey.seg.on": "on",
  "survey.seg.for": "for",
  "survey.seg.minOn": "min on",
  "survey.seg.itIs": "It is",
  "survey.ph.what": "what",
  "survey.ph.day": "day",
  "survey.flex.note":
    "Give it a length — ScheduleManager picks the time of day for you based on your productivity.",
  "survey.wants.note":
    "You pick the day. ScheduleManager generates only the duration (and the time of day) based on how productive and healthy the want is.",
  "survey.addAnother": "+ Add another",
  "survey.blanksHint":
    "Fill in the blanks — Tab jumps to the next blank, or click a blank to type. Leave blank if none. For days, “sat and sun” uses both, while “sat or sun” lets ScheduleManager pick one.",
  "survey.busy.title": "What schedule busyness do you want?",
  "survey.busy.middle.label": "In the middle",
  "survey.busy.middle.desc": "A balanced day.",
  "survey.busy.packed.label": "Packed",
  "survey.busy.packed.desc": "Fill the day up.",
  "survey.busy.loose.label": "Loose",
  "survey.busy.loose.desc": "Plenty of breathing room.",
  "survey.week.title": "Which week is this schedule for?",
  "survey.week.of": "Week of {date}",
  "survey.week.note":
    "Pick any week from now through the next two years. The schedule keeps the same weekly pattern — this just dates the days when you view it.",
  "survey.subjects.title": "Pick subjects for your routine (optional)",
  "survey.subjects.note":
    "Tap the subjects you want SM to fill the rest of your day with. Pick none and SM uses a balanced mix.",
  "survey.routines.label": "How many routines a day?",
  "survey.routines.note":
    "Roughly how many routine activities to fit each day (leave blank for automatic).",
  "survey.school.title": "Do you have school?",
  "survey.school.yes": "Yes",
  "survey.school.no": "No",
  "survey.school.note":
    "If yes, SM blocks out school Monday–Friday and fits everything else around it.",
  "survey.work.title": "Do you have work?",
  "survey.work.note":
    "If yes, SM blocks out work Monday–Friday and fits everything else around it.",
  "survey.wake.title": "When do you wake up and go to sleep?",
  "survey.wake.at": "I wake up at",
  "survey.wake.sleepAt": "I sleep at",
  "survey.wake.pm": "PM",
  "survey.wake.note":
    "SM starts your day at wake-up and ends it at bedtime. Leave blank for defaults (wake 7:00 / 8:30, sleep 9 PM).",
  "survey.cancel": "Cancel",
  "survey.back": "Back",
  "survey.next": "Next",
  "survey.done": "Done",
  "survey.removeEntry": "Remove this entry",
  // Grid
  "grid.defaultTitle": "Your schedule",
  "grid.generatedBy": "Generated by ScheduleManager",
  "grid.legend.fixed": "Fixed",
  "grid.legend.flex": "Activity",
  "grid.legend.want": "Want",
  "grid.legend.life": "Routine",
  "grid.legend.break": "Break",
  "grid.hint": "· drag to move · double-click to resize",
  "grid.empty": "Nothing scheduled yet. Tap ✏️ to add programs and wants.",
  "grid.hint2": "· double-tap a block to edit · double-tap empty space to add",
  "grid.week": "Week",
  "grid.day": "Day",
  "grid.stats": "Stats",
  "grid.blockName": "Block name",
  "grid.done": "Done",
  "grid.delete": "Delete",
  "grid.close": "Close",
  "block.new": "New block",
  "grid.back": "Back to lobby",
  "grid.edit": "Edit survey",
  // Routine block titles (added automatically to fill the day)
  "block.breakfast": "Breakfast",
  "block.lunch": "Lunch",
  "block.dinner": "Dinner",
  "block.sleep": "Sleep",
  "block.school": "School",
  "block.work": "Work",
  "block.break": "Break",
  "block.free": "Free time",
  "block.play": "Play",
  "block.math": "Math",
  "block.writing": "Writing",
  "block.reading": "Reading",
  "block.science": "Science",
  "block.spanish": "Spanish",
  "block.study": "Study",
  "block.music": "Music",
  "block.art": "Art",
  "block.exercise": "Exercise",
  "block.chores": "Chores",
  "block.outdoors": "Outdoors",
  "block.sport": "Sport",
  "block.familytime": "Family time",
  "block.games": "Games",
  "block.relax": "Relax",
  // AM/PM optional survey field
  "survey.ampm.any": "Any time",
  "survey.ampm.am": "AM",
  "survey.ampm.pm": "PM",
  // Weekday short labels
  "day.mon": "Mon",
  "day.tue": "Tue",
  "day.wed": "Wed",
  "day.thu": "Thu",
  "day.fri": "Fri",
  "day.sat": "Sat",
  "day.sun": "Sun",
};

const ES: Dict = {
  "login.signin": "Inicia sesión en tus horarios",
  "login.signup": "Crea tu cuenta",
  "login.username": "Usuario",
  "login.password": "Contraseña",
  "login.wait": "Espera…",
  "login.signupBtn": "Registrarse",
  "login.loginBtn": "Entrar",
  "login.haveAccount": "¿Ya tienes una cuenta?",
  "login.newHere": "¿Nuevo en ScheduleMaster?",
  "common.entered": "Visitado {n} veces",
  "lang.label": "Idioma",
  "weekStart.label": "La semana empieza el",
  "weekStart.starts": "Empieza {day}",
  "tour.howto": "Toca «Cómo usar» cuando quieras para aprender ScheduleMaster.",
  "tour.new": "Toca + para crear un horario nuevo.",
  "tour.newFolder": "Crea una carpeta para agrupar tus horarios.",
  "tour.folders": "Abre Carpetas para filtrar por carpeta.",
  "tour.search": "Busca tus horarios por nombre aquí.",
  "tour.lang": "Cambia el idioma de la app aquí.",
  "tour.logout": "Cierra tu sesión aquí.",
  "tour.quit": "Elimina tu cuenta para siempre aquí.",
  "tour.next": "Siguiente",
  "tour.skip": "Saltar",
  "tour.done": "¡Entendido!",
  "lobby.signedInAs": "Sesión de {name}",
  "lobby.logout": "Cerrar sesión",
  "lobby.quit": "Eliminar cuenta",
  "lobby.search": "Buscar horarios…",
  "lobby.new": "Nuevo horario",
  "lobby.howto": "Cómo usar",
  "lobby.newFolder": "Nueva carpeta",
  "lobby.folders": "Carpetas",
  "lobby.folderName": "Nombre de carpeta",
  "lobby.add": "Añadir",
  "lobby.all": "Todos ({n})",
  "lobby.noFolders": "Aún no hay carpetas — toca «Nueva carpeta».",
  "lobby.emptyNew":
    "Aún no hay horarios. Toca + y deja que ScheduleManager arme tu semana.",
  "lobby.emptyNoMatch": "Ningún horario coincide.",
  "lobby.noFolder": "Sin carpeta",
  "lobby.moveToFolder": "Mover a carpeta",
  "lobby.rename": "Renombrar",
  "lobby.duplicate": "Duplicar",
  "pw.title": "Cambiar contraseña",
  "pw.current": "Contraseña actual",
  "pw.new": "Nueva contraseña",
  "pw.save": "Guardar",
  "pw.cancel": "Cancelar",
  "pw.success": "Contraseña cambiada.",
  "pw.show": "Mostrar contraseña",
  "pw.hide": "Ocultar contraseña",
  "lobby.deleteSchedule": "Eliminar horario",
  "lobby.deleteFolder": "Eliminar carpeta {name}",
  "quit.title": "¿Estás seguro?",
  "quit.body":
    "Esto elimina permanentemente tu cuenta y todos sus horarios y carpetas. No se puede deshacer.",
  "quit.cancel": "Cancelar",
  "quit.confirm": "Sí, eliminar",
  "howto.title": "Cómo usar ScheduleMaster",
  "howto.s1": "Toca el botón + para empezar una nueva encuesta de horario.",
  "howto.s2":
    "Rellena los espacios: programas con hora fija, programas flexibles y tus deseos. Usa Tab para moverte entre espacios.",
  "howto.s3": "Elige qué tan ocupada quieres tu semana y pulsa Listo.",
  "howto.s4":
    "ScheduleManager arma tu semana — lo fijo se queda en su sitio y encaja lo flexible y los deseos en los mejores huecos.",
  "howto.s5":
    "De vuelta en el panel, busca tus horarios, renómbralos y usa carpetas para organizarlos.",
  "howto.got": "Entendido",
  "survey.subtitle": "Nueva encuesta de horario",
  "survey.q": "Pregunta {n} de {total}",
  "survey.fixed.title": "¿Algún programa con hora fija?",
  "survey.flex.title": "¿Algún programa sin hora fija?",
  "survey.wants.title": "¿Algún deseo?",
  "survey.seg.from": "de",
  "survey.seg.to": "a",
  "survey.seg.on": "el",
  "survey.seg.for": "por",
  "survey.seg.minOn": "min el",
  "survey.seg.itIs": "Es",
  "survey.ph.what": "qué",
  "survey.ph.day": "día",
  "survey.flex.note":
    "Dale una duración — ScheduleManager elige la hora del día según tu productividad.",
  "survey.wants.note":
    "Tú eliges el día. ScheduleManager genera solo la duración (y la hora del día) según lo productivo y saludable que sea el deseo.",
  "survey.addAnother": "+ Añadir otro",
  "survey.blanksHint":
    "Rellena los espacios — Tab salta al siguiente, o toca un espacio para escribir. Déjalo vacío si no hay. En los días, «sáb y dom» usa ambos, y «sáb o dom» deja que ScheduleManager elija uno.",
  "survey.busy.title": "¿Qué nivel de ocupación quieres?",
  "survey.busy.middle.label": "Intermedio",
  "survey.busy.middle.desc": "Un día equilibrado.",
  "survey.busy.packed.label": "Lleno",
  "survey.busy.packed.desc": "Llena el día.",
  "survey.busy.loose.label": "Tranquilo",
  "survey.busy.loose.desc": "Mucho espacio para respirar.",
  "survey.week.title": "¿Para qué semana es este horario?",
  "survey.week.of": "Semana del {date}",
  "survey.week.note":
    "Elige cualquier semana desde ahora hasta dentro de dos años. El horario mantiene el mismo patrón semanal — esto solo fecha los días al verlo.",
  "survey.subjects.title": "Elige materias para tu rutina (opcional)",
  "survey.subjects.note":
    "Toca las materias con las que quieres que SM llene el resto del día. Si no eliges ninguna, SM usa una mezcla equilibrada.",
  "survey.routines.label": "¿Cuántas rutinas al día?",
  "survey.routines.note":
    "Aproximadamente cuántas actividades de rutina caben cada día (déjalo vacío para automático).",
  "survey.school.title": "¿Tienes escuela?",
  "survey.school.yes": "Sí",
  "survey.school.no": "No",
  "survey.school.note":
    "Si sí, SM reserva la escuela de lunes a viernes y encaja todo lo demás alrededor.",
  "survey.work.title": "¿Tienes trabajo?",
  "survey.work.note":
    "Si sí, SM reserva el trabajo de lunes a viernes y encaja todo lo demás alrededor.",
  "survey.wake.title": "¿A qué hora te levantas y te acuestas?",
  "survey.wake.at": "Me levanto a las",
  "survey.wake.sleepAt": "Me acuesto a las",
  "survey.wake.pm": "PM",
  "survey.wake.note":
    "SM empieza tu día al despertar y lo termina a la hora de dormir. Déjalo vacío para los valores por defecto (despertar 7:00 / 8:30, dormir 9 PM).",
  "survey.cancel": "Cancelar",
  "survey.back": "Atrás",
  "survey.next": "Siguiente",
  "survey.done": "Listo",
  "survey.removeEntry": "Eliminar esta entrada",
  "grid.defaultTitle": "Tu horario",
  "grid.generatedBy": "Generado por ScheduleManager",
  "grid.legend.fixed": "Fijo",
  "grid.legend.flex": "Actividad",
  "grid.legend.want": "Deseo",
  "grid.legend.life": "Rutina",
  "grid.legend.break": "Descanso",
  "grid.hint": "· arrastra para mover · doble clic para cambiar tamaño",
  "grid.empty": "Nada programado aún. Toca ✏️ para añadir programas y deseos.",
  "grid.hint2": "· doble toque en un bloque para editar · doble toque en un hueco para añadir",
  "grid.week": "Semana",
  "grid.day": "Día",
  "grid.stats": "Datos",
  "grid.blockName": "Nombre del bloque",
  "grid.done": "Hecho",
  "grid.delete": "Eliminar",
  "grid.close": "Cerrar",
  "block.new": "Bloque nuevo",
  "grid.back": "Volver al panel",
  "grid.edit": "Editar encuesta",
  "block.breakfast": "Desayuno",
  "block.lunch": "Almuerzo",
  "block.dinner": "Cena",
  "block.sleep": "Dormir",
  "block.school": "Escuela",
  "block.work": "Trabajo",
  "block.break": "Descanso",
  "block.free": "Tiempo libre",
  "block.play": "Jugar",
  "block.math": "Matemáticas",
  "block.writing": "Escritura",
  "block.reading": "Lectura",
  "block.science": "Ciencias",
  "block.spanish": "Español",
  "block.study": "Estudiar",
  "block.music": "Música",
  "block.art": "Arte",
  "block.exercise": "Ejercicio",
  "block.chores": "Tareas",
  "block.outdoors": "Aire libre",
  "block.sport": "Deporte",
  "block.familytime": "Tiempo en familia",
  "block.games": "Juegos",
  "block.relax": "Relajarse",
  "survey.ampm.any": "Cualquier hora",
  "survey.ampm.am": "AM",
  "survey.ampm.pm": "PM",
  "day.mon": "Lun",
  "day.tue": "Mar",
  "day.wed": "Mié",
  "day.thu": "Jue",
  "day.fri": "Vie",
  "day.sat": "Sáb",
  "day.sun": "Dom",
};

const FR: Dict = {
  "login.signin": "Connecte-toi à tes emplois du temps",
  "login.signup": "Crée ton compte",
  "login.username": "Identifiant",
  "login.password": "Mot de passe",
  "login.wait": "Patiente…",
  "login.signupBtn": "S’inscrire",
  "login.loginBtn": "Se connecter",
  "login.haveAccount": "Tu as déjà un compte ?",
  "login.newHere": "Nouveau sur ScheduleMaster ?",
  "common.entered": "Visité {n} fois",
  "lang.label": "Langue",
  "weekStart.label": "La semaine commence le",
  "weekStart.starts": "Commence {day}",
  "tour.howto": "Touche « Mode d’emploi » à tout moment pour apprendre ScheduleMaster.",
  "tour.new": "Touche + pour créer un nouvel emploi du temps.",
  "tour.newFolder": "Crée un dossier pour regrouper tes emplois du temps.",
  "tour.folders": "Ouvre Dossiers pour filtrer par dossier.",
  "tour.search": "Recherche tes emplois du temps par nom ici.",
  "tour.lang": "Change la langue de l’appli ici.",
  "tour.logout": "Déconnecte-toi ici.",
  "tour.quit": "Supprime ton compte définitivement ici.",
  "tour.next": "Suivant",
  "tour.skip": "Passer",
  "tour.done": "Compris !",
  "lobby.signedInAs": "Connecté en tant que {name}",
  "lobby.logout": "Déconnexion",
  "lobby.quit": "Supprimer le compte",
  "lobby.search": "Rechercher des emplois du temps…",
  "lobby.new": "Nouvel emploi du temps",
  "lobby.howto": "Mode d’emploi",
  "lobby.newFolder": "Nouveau dossier",
  "lobby.folders": "Dossiers",
  "lobby.folderName": "Nom du dossier",
  "lobby.add": "Ajouter",
  "lobby.all": "Tous ({n})",
  "lobby.noFolders": "Aucun dossier — touche « Nouveau dossier ».",
  "lobby.emptyNew":
    "Aucun emploi du temps. Touche + et laisse ScheduleManager construire ta semaine.",
  "lobby.emptyNoMatch": "Aucun emploi du temps correspondant.",
  "lobby.noFolder": "Sans dossier",
  "lobby.moveToFolder": "Déplacer vers un dossier",
  "lobby.rename": "Renommer",
  "lobby.duplicate": "Dupliquer",
  "pw.title": "Changer le mot de passe",
  "pw.current": "Mot de passe actuel",
  "pw.new": "Nouveau mot de passe",
  "pw.save": "Enregistrer",
  "pw.cancel": "Annuler",
  "pw.success": "Mot de passe changé.",
  "pw.show": "Afficher le mot de passe",
  "pw.hide": "Masquer le mot de passe",
  "lobby.deleteSchedule": "Supprimer l’emploi du temps",
  "lobby.deleteFolder": "Supprimer le dossier {name}",
  "quit.title": "Es-tu sûr ?",
  "quit.body":
    "Cela supprime définitivement ton compte ainsi que tous ses emplois du temps et dossiers. C’est irréversible.",
  "quit.cancel": "Annuler",
  "quit.confirm": "Oui, supprimer",
  "howto.title": "Mode d’emploi de ScheduleMaster",
  "howto.s1": "Touche le bouton + pour démarrer un nouveau questionnaire.",
  "howto.s2":
    "Remplis les blancs : programmes à heure fixe, programmes flexibles et tes envies. Utilise Tab pour passer d’un blanc à l’autre.",
  "howto.s3": "Choisis le niveau d’occupation de ta semaine, puis appuie sur Terminé.",
  "howto.s4":
    "ScheduleManager construit ta semaine — le fixe reste en place, et il place le flexible et les envies dans les meilleurs créneaux.",
  "howto.s5":
    "De retour à l’accueil, recherche tes emplois du temps, renomme-les et utilise des dossiers pour t’organiser.",
  "howto.got": "Compris",
  "survey.subtitle": "Nouveau questionnaire",
  "survey.q": "Question {n} sur {total}",
  "survey.fixed.title": "Des programmes à heure fixe ?",
  "survey.flex.title": "Des programmes sans heure fixe ?",
  "survey.wants.title": "Des envies ?",
  "survey.seg.from": "de",
  "survey.seg.to": "à",
  "survey.seg.on": "le",
  "survey.seg.for": "pendant",
  "survey.seg.minOn": "min le",
  "survey.seg.itIs": "C’est",
  "survey.ph.what": "quoi",
  "survey.ph.day": "jour",
  "survey.flex.note":
    "Donne-lui une durée — ScheduleManager choisit l’heure de la journée selon ta productivité.",
  "survey.wants.note":
    "Tu choisis le jour. ScheduleManager génère seulement la durée (et l’heure) selon à quel point l’envie est productive et saine.",
  "survey.addAnother": "+ Ajouter",
  "survey.blanksHint":
    "Remplis les blancs — Tab passe au suivant, ou clique sur un blanc pour écrire. Laisse vide si aucun. Pour les jours, « sam et dim » utilise les deux, « sam ou dim » laisse ScheduleManager en choisir un.",
  "survey.busy.title": "Quel niveau d’occupation veux-tu ?",
  "survey.busy.middle.label": "Au milieu",
  "survey.busy.middle.desc": "Une journée équilibrée.",
  "survey.busy.packed.label": "Chargé",
  "survey.busy.packed.desc": "Remplis la journée.",
  "survey.busy.loose.label": "Léger",
  "survey.busy.loose.desc": "Beaucoup d’air.",
  "survey.week.title": "Pour quelle semaine est cet emploi du temps ?",
  "survey.week.of": "Semaine du {date}",
  "survey.week.note":
    "Choisis n’importe quelle semaine d’ici deux ans. L’emploi du temps garde le même schéma hebdomadaire — ceci ne fait que dater les jours à l’affichage.",
  "survey.subjects.title": "Choisis des matières pour ta routine (facultatif)",
  "survey.subjects.note":
    "Touche les matières avec lesquelles SM remplira le reste de ta journée. N’en choisis aucune et SM utilise un mélange équilibré.",
  "survey.routines.label": "Combien de routines par jour ?",
  "survey.routines.note":
    "Environ combien d’activités de routine placer chaque jour (laisse vide pour automatique).",
  "survey.school.title": "As-tu école ?",
  "survey.school.yes": "Oui",
  "survey.school.no": "Non",
  "survey.school.note":
    "Si oui, SM réserve l’école du lundi au vendredi et organise tout le reste autour.",
  "survey.work.title": "As-tu du travail ?",
  "survey.work.note":
    "Si oui, SM réserve le travail du lundi au vendredi et organise tout le reste autour.",
  "survey.wake.title": "À quelle heure te lèves-tu et te couches-tu ?",
  "survey.wake.at": "Je me lève à",
  "survey.wake.sleepAt": "Je me couche à",
  "survey.wake.pm": "PM",
  "survey.wake.note":
    "SM commence ta journée au réveil et la termine au coucher. Laisse vide pour les valeurs par défaut (réveil 7:00 / 8:30, coucher 21 h).",
  "survey.cancel": "Annuler",
  "survey.back": "Retour",
  "survey.next": "Suivant",
  "survey.done": "Terminé",
  "survey.removeEntry": "Supprimer cette entrée",
  "grid.defaultTitle": "Ton emploi du temps",
  "grid.generatedBy": "Généré par ScheduleManager",
  "grid.legend.fixed": "Fixe",
  "grid.legend.flex": "Activité",
  "grid.legend.want": "Envie",
  "grid.legend.life": "Routine",
  "grid.legend.break": "Pause",
  "grid.hint": "· glisse pour déplacer · double-clic pour redimensionner",
  "grid.empty": "Rien de prévu. Touche ✏️ pour ajouter des programmes et envies.",
  "grid.hint2": "· double-tape un bloc pour l'éditer · double-tape une case vide pour ajouter",
  "grid.week": "Semaine",
  "grid.day": "Jour",
  "grid.stats": "Stats",
  "grid.blockName": "Nom du bloc",
  "grid.done": "Fait",
  "grid.delete": "Supprimer",
  "grid.close": "Fermer",
  "block.new": "Nouveau bloc",
  "grid.back": "Retour à l’accueil",
  "grid.edit": "Modifier le questionnaire",
  "block.breakfast": "Petit-déj",
  "block.lunch": "Déjeuner",
  "block.dinner": "Dîner",
  "block.sleep": "Dormir",
  "block.school": "École",
  "block.work": "Travail",
  "block.break": "Pause",
  "block.free": "Temps libre",
  "block.play": "Jouer",
  "block.math": "Maths",
  "block.writing": "Écriture",
  "block.reading": "Lecture",
  "block.science": "Sciences",
  "block.spanish": "Espagnol",
  "block.study": "Étude",
  "block.music": "Musique",
  "block.art": "Art",
  "block.exercise": "Exercice",
  "block.chores": "Corvées",
  "block.outdoors": "Plein air",
  "block.sport": "Sport",
  "block.familytime": "En famille",
  "block.games": "Jeux",
  "block.relax": "Détente",
  "survey.ampm.any": "N’importe quand",
  "survey.ampm.am": "AM",
  "survey.ampm.pm": "PM",
  "day.mon": "Lun",
  "day.tue": "Mar",
  "day.wed": "Mer",
  "day.thu": "Jeu",
  "day.fri": "Ven",
  "day.sat": "Sam",
  "day.sun": "Dim",
};

const ZH: Dict = {
  "login.signin": "登录查看你的日程",
  "login.signup": "创建账户",
  "login.username": "用户名",
  "login.password": "密码",
  "login.wait": "请稍候…",
  "login.signupBtn": "注册",
  "login.loginBtn": "登录",
  "login.haveAccount": "已经有账户了？",
  "login.newHere": "第一次使用 ScheduleMaster？",
  "common.entered": "已访问 {n} 次",
  "lang.label": "语言",
  "weekStart.label": "每周开始于",
  "weekStart.starts": "{day}开始",
  "tour.howto": "随时点击“使用说明”来学习 ScheduleMaster。",
  "tour.new": "点击 + 创建一个新日程。",
  "tour.newFolder": "创建文件夹来整理你的日程。",
  "tour.folders": "打开“文件夹”按文件夹筛选。",
  "tour.search": "在这里按名称搜索你的日程。",
  "tour.lang": "在这里切换应用语言。",
  "tour.logout": "在这里退出登录。",
  "tour.quit": "在这里永久删除你的账户。",
  "tour.next": "下一步",
  "tour.skip": "跳过",
  "tour.done": "知道了！",
  "lobby.signedInAs": "当前用户：{name}",
  "lobby.logout": "退出登录",
  "lobby.quit": "注销账户",
  "lobby.search": "搜索日程…",
  "lobby.new": "新建日程",
  "lobby.howto": "使用说明",
  "lobby.newFolder": "新建文件夹",
  "lobby.folders": "文件夹",
  "lobby.folderName": "文件夹名称",
  "lobby.add": "添加",
  "lobby.all": "全部（{n}）",
  "lobby.noFolders": "还没有文件夹——点击“新建文件夹”。",
  "lobby.emptyNew": "还没有日程。点击 + 让 ScheduleManager 为你安排一周。",
  "lobby.emptyNoMatch": "没有匹配的日程。",
  "lobby.noFolder": "无文件夹",
  "lobby.moveToFolder": "移动到文件夹",
  "lobby.rename": "重命名",
  "lobby.duplicate": "复制",
  "pw.title": "修改密码",
  "pw.current": "当前密码",
  "pw.new": "新密码",
  "pw.save": "保存",
  "pw.cancel": "取消",
  "pw.success": "密码已修改。",
  "pw.show": "显示密码",
  "pw.hide": "隐藏密码",
  "lobby.deleteSchedule": "删除日程",
  "lobby.deleteFolder": "删除文件夹 {name}",
  "quit.title": "确定吗？",
  "quit.body": "这将永久删除你的账户以及其中的所有日程和文件夹，无法撤销。",
  "quit.cancel": "取消",
  "quit.confirm": "确认删除",
  "howto.title": "如何使用 ScheduleMaster",
  "howto.s1": "点击 + 按钮开始新的日程问卷。",
  "howto.s2": "填空：固定时间的项目、灵活项目和你的愿望。用 Tab 键在空格间移动。",
  "howto.s3": "选择你想要的一周忙碌程度，然后点击完成。",
  "howto.s4":
    "ScheduleManager 会安排你的一周——固定项目保持不变，并把灵活项目和愿望放进最合适的时段。",
  "howto.s5": "回到大厅后，可以搜索日程、重命名，并用文件夹整理。",
  "howto.got": "知道了",
  "survey.subtitle": "新日程问卷",
  "survey.q": "第 {n} 题，共 {total} 题",
  "survey.fixed.title": "有固定时间的项目吗？",
  "survey.flex.title": "有没有固定时间的项目吗？",
  "survey.wants.title": "有什么愿望吗？",
  "survey.seg.from": "从",
  "survey.seg.to": "到",
  "survey.seg.on": "在",
  "survey.seg.for": "持续",
  "survey.seg.minOn": "分钟，在",
  "survey.seg.itIs": "这是",
  "survey.ph.what": "什么",
  "survey.ph.day": "星期",
  "survey.flex.note":
    "给它一个时长——ScheduleManager 会根据你的效率为你选择一天中的时间。",
  "survey.wants.note":
    "你选择哪天。ScheduleManager 仅根据愿望的效率和健康程度生成时长（和时间）。",
  "survey.addAnother": "+ 再添加一个",
  "survey.blanksHint":
    "填空——Tab 跳到下一个空格，或点击空格输入。没有就留空。填星期时，“六和日”两天都排，“六或日”让 ScheduleManager 选一天。",
  "survey.busy.title": "你想要多忙的日程？",
  "survey.busy.middle.label": "适中",
  "survey.busy.middle.desc": "平衡的一天。",
  "survey.busy.packed.label": "满满当当",
  "survey.busy.packed.desc": "把一天排满。",
  "survey.busy.loose.label": "宽松",
  "survey.busy.loose.desc": "留足喘息空间。",
  "survey.week.title": "这个日程是哪一周的？",
  "survey.week.of": "{date} 那一周",
  "survey.week.note":
    "从现在到未来两年内任选一周。日程保持相同的每周模式——这只是查看时给每天标上日期。",
  "survey.subjects.title": "选择日常活动的科目（可选）",
  "survey.subjects.note":
    "点击你想让 SM 用来填满一天其余时间的科目。不选则 SM 使用均衡的组合。",
  "survey.routines.label": "每天安排多少个日常活动？",
  "survey.routines.note": "每天大约安排多少个日常活动（留空则自动）。",
  "survey.school.title": "你要上学吗？",
  "survey.school.yes": "是",
  "survey.school.no": "否",
  "survey.school.note": "如果是，SM 会在周一至周五排好上学时间，并把其他活动安排在周围。",
  "survey.work.title": "你要上班吗？",
  "survey.work.note": "如果是，SM 会在周一至周五排好上班时间，并把其他活动安排在周围。",
  "survey.wake.title": "你几点起床和睡觉？",
  "survey.wake.at": "我起床于",
  "survey.wake.sleepAt": "我睡觉于",
  "survey.wake.pm": "下午/晚上",
  "survey.wake.note":
    "SM 从起床开始你的一天，到睡觉结束。留空则使用默认值（起床 7:00 / 8:30，睡觉 晚上 9 点）。",
  "survey.cancel": "取消",
  "survey.back": "返回",
  "survey.next": "下一步",
  "survey.done": "完成",
  "survey.removeEntry": "删除此项",
  "grid.defaultTitle": "你的日程",
  "grid.generatedBy": "由 ScheduleManager 生成",
  "grid.legend.fixed": "固定",
  "grid.legend.flex": "活动",
  "grid.legend.want": "愿望",
  "grid.legend.life": "日常",
  "grid.legend.break": "休息",
  "grid.hint": "· 拖动以移动 · 双击以调整大小",
  "grid.empty": "还没有安排。点击 ✏️ 添加项目和愿望。",
  "grid.hint2": "· 双击方块可编辑 · 双击空白处可添加",
  "grid.week": "周",
  "grid.day": "日",
  "grid.stats": "统计",
  "grid.blockName": "方块名称",
  "grid.done": "完成",
  "grid.delete": "删除",
  "grid.close": "关闭",
  "block.new": "新方块",
  "grid.back": "返回大厅",
  "grid.edit": "编辑问卷",
  "block.breakfast": "早餐",
  "block.lunch": "午餐",
  "block.dinner": "晚餐",
  "block.sleep": "睡觉",
  "block.school": "上学",
  "block.work": "上班",
  "block.break": "休息",
  "block.free": "空闲时间",
  "block.play": "玩耍",
  "block.math": "数学",
  "block.writing": "写作",
  "block.reading": "阅读",
  "block.science": "科学",
  "block.spanish": "西班牙语",
  "block.study": "学习",
  "block.music": "音乐",
  "block.art": "美术",
  "block.exercise": "运动",
  "block.chores": "家务",
  "block.outdoors": "户外",
  "block.sport": "体育",
  "block.familytime": "家庭时间",
  "block.games": "游戏",
  "block.relax": "放松",
  "survey.ampm.any": "任意时间",
  "survey.ampm.am": "上午",
  "survey.ampm.pm": "下午",
  "day.mon": "周一",
  "day.tue": "周二",
  "day.wed": "周三",
  "day.thu": "周四",
  "day.fri": "周五",
  "day.sat": "周六",
  "day.sun": "周日",
};

const STRINGS: Record<Lang, Dict> = { en: EN, es: ES, fr: FR, zh: ZH };

function interpolate(s: string, vars?: Record<string, string | number>) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

export type Theme = "light" | "dark";

type I18n = {
  lang: Lang;
  setLang: (l: Lang) => void;
  locale: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
  theme: Theme;
  toggleTheme: () => void;
  // Which weekday the grid starts on (0 = Mon … 6 = Sun). Display only —
  // stored schedules always keep index 0 = Monday.
  weekStartDay: number;
  setWeekStartDay: (d: number) => void;
};

const I18nContext = createContext<I18n | null>(null);

function isLang(v: string | null): v is Lang {
  return v === "en" || v === "es" || v === "fr" || v === "zh";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [theme, setTheme] = useState<Theme>("light");
  const [weekStartDay, setWeekStartDayState] = useState(0); // Monday

  // Restore the saved language + theme on mount (after hydration).
  useEffect(() => {
    const saved = localStorage.getItem("sm_lang");
    if (isLang(saved)) setLangState(saved);
    const savedWeekStart = parseInt(
      localStorage.getItem("sm_week_start") ?? "",
      10,
    );
    if (savedWeekStart >= 0 && savedWeekStart <= 6)
      setWeekStartDayState(savedWeekStart);
    const savedTheme = localStorage.getItem("sm_theme");
    const initial: Theme =
      savedTheme === "dark" || savedTheme === "light"
        ? savedTheme
        : window.matchMedia?.("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("sm_lang", l);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = l;
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((cur) => {
      const next: Theme = cur === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem("sm_theme", next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const setWeekStartDay = useCallback((d: number) => {
    setWeekStartDayState(d);
    try {
      localStorage.setItem("sm_week_start", String(d));
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      interpolate(STRINGS[lang][key] ?? EN[key] ?? key, vars),
    [lang],
  );

  return (
    <I18nContext.Provider
      value={{
        lang,
        setLang,
        locale: LOCALES[lang],
        t,
        theme,
        toggleTheme,
        weekStartDay,
        setWeekStartDay,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useI18n();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={`flex h-8 w-8 items-center justify-center rounded-lg border border-black/[.1] text-sm transition-colors hover:border-indigo-400 dark:border-white/[.15] ${className}`}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

const WEEK_START_KEYS = [
  "day.mon",
  "day.tue",
  "day.wed",
  "day.thu",
  "day.fri",
  "day.sat",
  "day.sun",
];

/** Pick which weekday the schedule grid starts on. */
export function WeekStartSwitcher({ className = "" }: { className?: string }) {
  const { weekStartDay, setWeekStartDay, t } = useI18n();
  return (
    <select
      aria-label={t("weekStart.label")}
      title={t("weekStart.label")}
      value={weekStartDay}
      onChange={(e) => setWeekStartDay(Number(e.target.value))}
      className={`h-8 rounded-lg border border-black/[.1] bg-transparent px-2 text-xs text-zinc-600 outline-none focus:border-zinc-400 dark:border-white/[.15] dark:text-zinc-300 ${className}`}
    >
      {WEEK_START_KEYS.map((key, i) => (
        <option key={key} value={i}>
          {t("weekStart.starts", { day: t(key) })}
        </option>
      ))}
    </select>
  );
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  return (
    <select
      aria-label={t("lang.label")}
      value={lang}
      onChange={(e) => setLang(e.target.value as Lang)}
      className={`h-8 rounded-lg border border-black/[.1] bg-transparent px-2 text-xs text-zinc-600 outline-none focus:border-zinc-400 dark:border-white/[.15] dark:text-zinc-300 ${className}`}
    >
      {LANGS.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}

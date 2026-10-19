/* EventEase language options: English, हिन्दी, മലയാളം, Español. Translates static labels; choice is saved. */
(function(){
  const ROWS=`Home|होम|ഹോം|Inicio
About|परिचय|ഞങ്ങളെക്കുറിച്ച്|Acerca de
Services|सेवाएँ|സേവനങ്ങൾ|Servicios
Contact|संपर्क|ബന്ധപ്പെടുക|Contacto
Login|लॉगिन|ലോഗിൻ|Entrar
Get Started|शुरू करें|തുടങ്ങാം|Comenzar
Sign out|साइन आउट|സൈൻ ഔട്ട്|Cerrar sesión
Dashboard|डैशबोर्ड|ഡാഷ്ബോർഡ്|Panel
Overview|सारांश|അവലോകനം|Resumen
Events|कार्यक्रम|പരിപാടികൾ|Eventos
Guests|मेहमान|അതിഥികൾ|Invitados
Tasks|कार्य|ജോലികൾ|Tareas
Budget|बजट|ബജറ്റ്|Presupuesto
Venue|स्थान|വേദി|Lugar
Calendar|कैलेंडर|കലണ്ടർ|Calendario
AI Assistant|एआई सहायक|എഐ സഹായി|Asistente IA
Everything at a glance.|एक नज़र में सब कुछ।|ഒറ്റനോട്ടത്തിൽ എല്ലാം.|Todo de un vistazo.
Total events|कुल कार्यक्रम|ആകെ പരിപാടികൾ|Eventos totales
Upcoming events|आगामी कार्यक्रम|വരാനിരിക്കുന്ന പരിപാടികൾ|Próximos eventos
Task progress|कार्य प्रगति|ജോലി പുരോഗതി|Progreso de tareas
Quick actions|त्वरित कार्य|വേഗത്തിലുള്ള പ്രവർത്തനങ്ങൾ|Acciones rápidas
Create|बनाएँ|സൃഷ്ടിക്കുക|Crear
Add|जोड़ें|ചേർക്കുക|Añadir
Countdown|उलटी गिनती|കൗണ്ട്ഡൗൺ|Cuenta atrás
days left|दिन शेष|ദിവസം ബാക്കി|días restantes
Today|आज|ഇന്ന്|Hoy
Starts|शुरू होता है|ആരംഭിക്കുന്നു|Comienza
Reminder|अनुस्मारक|ഓർമ്മപ്പെടുത്തൽ|Recordatorio
Auto checklist|स्वचालित चेकलिस्ट|ഓട്ടോ ചെക്ക്‌ലിസ്റ്റ്|Lista automática
Settings|सेटिंग्स|ക്രമീകരണങ്ങൾ|Ajustes
Language|भाषा|ഭാഷ|Idioma
Appearance|दिखावट|രൂപം|Apariencia
Notifications|सूचनाएँ|അറിയിപ്പുകൾ|Notificaciones
Accessibility|पहुँच-सुलभता|ഉപയോഗസൗകര്യം|Accesibilidad
Event reminders|कार्यक्रम अनुस्मारक|പരിപാടി ഓർമ്മപ്പെടുത്തലുകൾ|Recordatorios
Task reminders|कार्य अनुस्मारक|ജോലി ഓർമ്മപ്പെടുത്തലുകൾ|Recordatorios de tareas
Notification sounds|सूचना ध्वनि|അറിയിപ്പ് ശബ്ദങ്ങൾ|Sonidos
Event Preferences|कार्यक्रम प्राथमिकताएँ|പരിപാടി മുൻഗണനകൾ|Preferencias
Data & Privacy|डेटा और गोपनीयता|ഡാറ്റയും സ്വകാര്യതയും|Datos y privacidad
Larger text|बड़ा टेक्स्ट|വലിയ അക്ഷരങ്ങൾ|Texto grande
Reduced animations|कम एनिमेशन|കുറഞ്ഞ ആനിമേഷനുകൾ|Menos animaciones
About EventEase|EventEase के बारे में|EventEase-നെ കുറിച്ച്|Acerca de EventEase
General|सामान्य|പൊതുവായത്|General
Upcoming|आगामी|വരാനിരിക്കുന്നവ|Próximos`.split('\n').map(r=>r.split('|'));
  const LANGS={en:['English','en-IN'],hi:['हिन्दी','hi-IN'],ml:['മലയാളം','ml-IN']};
  const IDX={hi:1,ml:2};
  const M={};Object.keys(IDX).forEach(l=>{M[l]={};ROWS.forEach(r=>M[l][r[0]]=r[IDX[l]])});
  let lang=(window.EESettings&&EESettings.get().language)||'en';
  if(!LANGS[lang])lang='en';
  function t(k){return (M[lang]&&M[lang][k])||k}
  function apply(){
    document.documentElement.lang=lang;
    const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:n=>/^(SCRIPT|STYLE|SELECT|OPTION|TEXTAREA)$/.test(n.parentNode.nodeName)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
    const nodes=[];while(w.nextNode())nodes.push(w.currentNode);
    nodes.forEach(n=>{
      if(n.__o!==undefined&&n.nodeValue!==n.__t)n.__o=undefined;
      const src=n.__o!==undefined?n.__o:n.nodeValue,key=src.trim();
      const tr=lang==='en'?key:(M[lang][key]||key);
      if(M.hi[key]!==undefined||n.__o!==undefined){n.__o=src;n.nodeValue=src.replace(key,tr);n.__t=n.nodeValue}
    });
  }
  window.EEI18n={t,locale:()=>LANGS[lang][1],apply};
  apply();document.addEventListener('ee:settings',()=>{const l=EESettings.get().language;if(LANGS[l]&&l!==lang){lang=l;apply();document.dispatchEvent(new Event('ee:lang'))}});document.addEventListener('ee:render',apply);
})();

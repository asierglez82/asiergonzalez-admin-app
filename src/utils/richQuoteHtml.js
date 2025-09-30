export function buildRichQuoteHtml(phrase = '', language = 'es') {
  const safePhrase = (phrase || '').toString();
  const p1 = language === 'es'
    ? 'En el contexto actual de cambio acelerado, esta reflexión invita a poner a las personas en el centro. La innovación solo cobra sentido cuando mejora vidas reales y amplifica capacidades humanas.'
    : 'In today\'s fast-changing context, this reflection invites us to put people at the center. Innovation only makes sense when it improves real lives and amplifies human capabilities.';
  const p2 = language === 'es'
    ? 'La tecnología debe ser una herramienta: aliada de la creatividad, del criterio y del propósito. No se trata de sustituir, sino de potenciar. Ese es el camino hacia un progreso sostenible.'
    : 'Technology should be a tool—an ally to creativity, judgment, and purpose. It\'s not about replacing but empowering. That\'s the path toward sustainable progress.';
  const p3 = language === 'es'
    ? 'Abramos la conversación: ¿cómo alineamos los avances con valores humanos y con impacto real?'
    : 'Let\'s open the conversation: how do we align progress with human values and real impact?';

  return `
    <div style="width: 100%;height: auto;clear: both;float: left;position: relative;padding-left: 70px;margin-top: 10px;margin-bottom: 10px;">
      <div style="position: relative;margin-bottom: 30px">
        <img style="width: 40px;height: 40px" src="/assets/img/svg/quote.svg" alt="tumb" />
      </div>
      <p style="font-size: 20px;font-style: italic;margin-bottom: 23px">${safePhrase}</p>
    </div>
    <br>
    <p>${p1}</p><br>
    <p>${p2}</p><br>
    <p>${p3}</p>
  `;
}



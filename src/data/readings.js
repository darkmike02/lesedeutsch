// src/data/readings.js
export const INITIAL_READINGS = [
  {
    id: 'a1-cafe',
    level: 'A1',
    title: 'Im Café in Berlin',
    category: 'Vida Cotidiana',
    readTime: '2 min',
    xp: 30,
    content: 'Anna geht in ein kleines Café in Berlin. Sie bestellt eine Tasse Kaffee und ein Stück Kuchen. Der Kellner lächelt freundlich und bringt die Bestellung schnell an den Tisch. Das Wetter ist heute wunderbar.',
    translation: 'Anna va a un pequeño café en Berlín. Ella pide una taza de café y un trozo de pastel. El mesero sonríe amablemente y trae el pedido rápido a la mesa. El clima está maravilloso hoy.'
  },
  {
    id: 'a2-reise',
    level: 'A2',
    title: 'Eine Zugreise nach München',
    category: 'Viajes',
    readTime: '3 min',
    xp: 50,
    content: 'Letztes Wochenende bin ich mit dem Zug nach München gefahren. Am Bahnhof habe ich mir eine Fahrkarte gekauft. Während der Fahrt habe ich aus dem Fenster geschaut und die grünen Berge gesehen.',
    translation: 'El fin de semana pasado viajé en tren a Múnich. En la estación me compré un boleto. Durante el viaje miré por la ventana y vi las montañas verdes.'
  },
  {
    id: 'b1-umwelt',
    level: 'B1',
    title: 'Nachhaltigkeit im Alltag',
    category: 'Medio Ambiente',
    readTime: '4 min',
    xp: 70,
    content: 'Immer mehr Menschen versuchen, im Alltag umweltbewusster zu leben. Sie verzichten auf Plastiktüten, fahren mit dem Fahrrad zur Arbeit und kaufen regionale Lebensmittel auf dem Markt ein.',
    translation: 'Cada vez más personas intentan vivir de forma más ecológica en el día a día. Renuncian a las bolsas de plástico, van en bicicleta al trabajo y compran alimentos regionales en el mercado.'
  },
  {
    id: 'b2-homeoffice',
    level: 'B2',
    title: 'Die Zukunft der Arbeit',
    category: 'Sociedad y Trabajo',
    readTime: '5 min',
    xp: 90,
    content: 'Die fortschreitende Digitalisierung hat unsere Arbeitswelt grundlegend verändert. Während viele Arbeitnehmer die Flexibilität des Homeoffice schätzen, warnen Experten vor der zunehmenden Entgrenzung zwischen Beruf und Privatleben.',
    translation: 'La digitalización progresiva ha cambiado fundamentalmente nuestro mundo laboral. Mientras muchos empleados aprecian la flexibilidad del teletrabajo, los expertos advierten sobre la creciente difuminación de límites entre profesión y vida privada.'
  },
  {
    id: 'c1-wissenschaft',
    level: 'C1',
    title: 'Künstliche Intelligenz in der Medizin',
    category: 'Ciencia y Ética',
    readTime: '6 min',
    xp: 130,
    content: 'Den neuesten Forschungsergebnissen zufolge sei der Einsatz selbstlernender Algorithmen in der Diagnostik nicht mehr wegzudenken. Dennoch bedarf es strenger ethischer Richtlinien, um den Schutz sensibler Patientendaten zu gewährleisten.',
    translation: 'Según los últimos resultados de investigación, el uso de algoritmos de autoaprendizaje en el diagnóstico ya es indispensable. Sin embargo, se requieren estrictas directrices éticas para garantizar la protección de datos sensibles de los pacientes.'
  }
];

export const INITIAL_DICTIONARY = {
  'kaffee': {
    word: 'Kaffee',
    lemma: 'der Kaffee',
    type: 'Sustantivo',
    gender: 'masculino',
    article: 'der',
    plural: 'die Kaffees',
    meaning: 'El café',
    contextNote: 'En el texto está en Akkusativ singular (eine Tasse Kaffee).',
    declension: {
      nominativ: 'der Kaffee',
      akkusativ: 'den Kaffee',
      dativ: 'dem Kaffee',
      genitiv: 'des Kaffees'
    },
    example: 'Ich trinke jeden Morgen einen heißen Kaffee.',
    exampleTranslation: 'Tomo un café caliente cada mañana.'
  },
  'tasse': {
    word: 'Tasse',
    lemma: 'die Tasse',
    type: 'Sustantivo',
    gender: 'femenino',
    article: 'die',
    plural: 'die Tassen',
    meaning: 'La taza',
    contextNote: 'Akkusativ singular femenino (bestellt eine Tasse).',
    declension: {
      nominativ: 'die Tasse',
      akkusativ: 'die Tasse',
      dativ: 'der Tasse',
      genitiv: 'der Tasse'
    },
    example: 'Sie stellt die Tasse auf den Tisch.',
    exampleTranslation: 'Ella pone la taza sobre la mesa.'
  },
  'bestellt': {
    word: 'bestellt',
    lemma: 'bestellen',
    type: 'Verbo',
    gender: 'verbo',
    meaning: 'pedir / ordenar (algo)',
    contextNote: '3ª persona singular en Präsens (sie bestellt) o Partizip II.',
    conjugation: {
      ich: 'bestelle',
      du: 'bestellst',
      er_sie_es: 'bestellt',
      wir: 'bestellen',
      ihr: 'bestellt',
      sie_Sie: 'bestellen',
      praeteritum: 'bestellte',
      perfekt: 'hat bestellt'
    },
    example: 'Er bestellt eine Pizza im Restaurant.',
    exampleTranslation: 'Él pide una pizza en el restaurante.'
  }
};
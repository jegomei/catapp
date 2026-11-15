function rankedPeople(room) {
  return room.people.map(person => ({ id: person.id, name: person.name, score: person.correct.filter(Boolean).length }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'es'));
}

export function resultReport(room, location) {
  return {
    title: room.title,
    category: room.theme === 'blanco' ? 'Cata de blanco' : 'Cata de tinto',
    theme: room.theme,
    date: new Intl.DateTimeFormat('es', { dateStyle: 'long' }).format(new Date(room.startedAt ?? room.created)),
    location: location.trim(),
    wines: room.order.map(id => room.wines.find(wine => wine.id === id).label),
    people: rankedPeople(room),
  };
}

function tastingDetails(report) {
  return [report.date, report.location].filter(Boolean).join(' · ');
}

export function resultText(report) {
  const total = report.wines.length;
  return [
    report.title, report.category, tastingDetails(report), '',
    'Clasificación',
    ...report.people.map(person => `${person.name} — ${person.score}/${total} ${person.score === 1 ? 'acierto' : 'aciertos'}`),
    '', 'Vinos catados',
    ...report.wines.map((wine, index) => `${index + 1}. ${wine}`),
  ].join('\n');
}

const months = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function parseResultText(text) {
  const invalid = () => new Error('Pega el texto completo de Compartir resultados, incluida la lista de vinos.');
  const [title, category, details, heading, ...rows] = text.split(/\r\n?|\n/).map(line => line.trim()).filter(Boolean);
  const theme = /^Cata de (tinto|blanco)$/.exec(category)?.[1];
  const wineHeading = rows.indexOf('Vinos catados');
  if (!title || title.length > 70 || !theme || heading !== 'Clasificación' || wineHeading < 2 || wineHeading > 10) {
    throw invalid();
  }

  const dateMatch = /^(\d{1,2}) de ([a-z]+) de (\d{4})(?:\s*·\s*(.+))?$/i.exec(details);
  if (!dateMatch) throw invalid();
  const [, day, monthName, year, place = ''] = dateMatch;
  const month = months.indexOf(monthName.toLowerCase()) + 1;
  const calendarDay = `${year}-${String(month).padStart(2, '0')}-${day.padStart(2, '0')}`;
  const date = new Date(calendarDay + 'T12:00:00Z');
  if (Number.isNaN(date.getTime()) || !date.toISOString().startsWith(calendarDay) || place.length > 90) throw invalid();

  const wineRows = rows.slice(wineHeading + 1);
  if (wineRows.length < 2 || wineRows.length > 12) throw invalid();
  const wines = wineRows.map((row, index) => {
    const line = /^(\d{1,2})\.\s+(.{1,90})$/u.exec(row);
    if (!line || Number(line[1]) !== index + 1) throw invalid();
    return line[2];
  });
  const people = rows.slice(0, wineHeading).map(row => {
    const score = /^(.{1,32})\s+[—–-]\s+(\d{1,2})\s*\/\s*(\d{1,2})\s+aciertos?$/u.exec(row);
    if (!score || Number(score[3]) !== wines.length || Number(score[2]) > wines.length) throw invalid();
    return { name: score[1].trim(), score: Number(score[2]) };
  }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'es'));

  return {
    created: date.toISOString(),
    report: {
      title, category, theme, location: place.trim(), wines, people,
      date: new Intl.DateTimeFormat('es', { dateStyle: 'long', timeZone: 'UTC' }).format(date),
    },
  };
}

const palettes = {
  tinto: { background: '#170c10', panel: '#251319', line: '#50303a', ink: '#fff0e7', accent: '#efa9b7', muted: '#cfb3b8' },
  blanco: { background: '#f7efde', panel: '#fff9ed', line: '#dac49d', ink: '#382a18', accent: '#845a1f', muted: '#635137' },
};
const serif = '"Instrument Serif", Georgia, serif';
const sans = '"DM Sans", system-ui, sans-serif';
const titleFont = `400 72px ${serif}`;
const listFont = `400 27px ${sans}`;
const nameFont = `600 27px ${sans}`;
const detailsFont = `500 26px ${sans}`;
const headingFont = `400 45px ${serif}`;
const labelFont = `700 22px ${sans}`;

function linesFor(context, text, width, font) {
  context.font = font;
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const candidate = line ? line + ' ' + word : word;
    if (context.measureText(candidate).width <= width) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = '';
    for (const letter of word) {
      if (context.measureText(line + letter).width > width) {
        lines.push(line);
        line = '';
      }
      line += letter;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawLines(context, lines, x, y, lineHeight, font, color) {
  context.font = font;
  context.fillStyle = color;
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
}

function roundedRect(context, x, y, width, height) {
  context.beginPath();
  context.roundRect(x, y, width, height, 22);
}

function drawPhoto(context, photo, x, y, width, height, palette) {
  // Frame the bowl of the glass when cropping the portrait photo into a banner.
  const scale = Math.max(width / photo.naturalWidth, height / photo.naturalHeight);
  const photoWidth = photo.naturalWidth * scale;
  const photoHeight = photo.naturalHeight * scale;
  context.save();
  roundedRect(context, x, y, width, height);
  context.clip();
  context.drawImage(photo, x + (width - photoWidth) / 2, y + (height - photoHeight) * .38, photoWidth, photoHeight);
  context.restore();
  roundedRect(context, x, y, width, height);
  context.strokeStyle = palette.line;
  context.stroke();
}

function drawGlasses(context, score, x, y, color) {
  const outline = new Path2D('M7 2h10l1.3 6.1A5.7 5.7 0 0 1 12.7 15h-1.4a5.7 5.7 0 0 1-5.6-6.9L7 2Zm5 13v7m-4 0h8');
  const wine = new Path2D('M6.2 9h11.6a5.7 5.7 0 0 1-5.1 5.3h-1.4A5.7 5.7 0 0 1 6.2 9Z');
  context.save();
  context.translate(x, y);
  context.fillStyle = color;
  context.strokeStyle = color;
  context.lineWidth = 1.65;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (let index = 0; index < score; index++) {
    context.fill(wine);
    context.stroke(outline);
    context.translate(23, 0);
  }
  context.restore();
}

export async function resultImage(report, photoUrl) {
  const photo = new Image();
  photo.src = photoUrl;
  await Promise.all([
    photo.decode(),
    Promise.allSettled([titleFont, listFont, nameFont, detailsFont, labelFont].map(font => document.fonts.load(font))),
  ]);

  const width = 1080;
  const margin = 56;
  const availableWidth = width - margin * 2;
  const gap = 24;
  const columnWidth = (availableWidth - gap) / 2;
  const padding = 28;
  const innerWidth = columnWidth - padding * 2;
  const photoHeight = 420;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  const context = canvas.getContext('2d');

  const title = linesFor(context, report.title, availableWidth, titleFont);
  const details = linesFor(context, tastingDetails(report), availableWidth, detailsFont);
  const wines = report.wines.map(wine => linesFor(context, wine, innerWidth - 45, listFont));
  const names = report.people.map(person => linesFor(context, person.name, innerWidth, nameFont));
  const wineHeights = wines.map(lines => lines.length * 33 + 21);
  const scoreHeights = names.map(lines => lines.length * 33 + 43);
  const titleY = 113;
  const detailsY = titleY + title.length * 72 + 8;
  const photoY = detailsY + details.length * 35 + 24;
  const panelY = photoY + photoHeight + gap;
  const listY = panelY + 91;
  const panelHeight = 101 + Math.max(
    wineHeights.reduce((sum, height) => sum + height, 0),
    scoreHeights.reduce((sum, height) => sum + height, 0),
  );
  canvas.height = panelY + panelHeight + margin;

  const palette = palettes[report.theme];
  context.textBaseline = 'top';
  context.fillStyle = palette.background;
  context.fillRect(0, 0, width, canvas.height);
  drawLines(context, [report.category.toUpperCase()], margin, 63, 26, labelFont, palette.accent);
  context.textAlign = 'right';
  drawLines(context, ['Catapp.'], width - margin, 50, 41, headingFont, palette.ink);
  context.textAlign = 'left';
  drawLines(context, title, margin, titleY, 72, titleFont, palette.ink);
  drawLines(context, details, margin, detailsY, 35, detailsFont, palette.muted);
  drawPhoto(context, photo, margin, photoY, availableWidth, photoHeight, palette);

  const scoresColumn = margin + columnWidth + gap;
  for (const [x, label] of [[margin, 'Vinos catados'], [scoresColumn, 'Clasificación']]) {
    roundedRect(context, x, panelY, columnWidth, panelHeight);
    context.fillStyle = palette.panel;
    context.fill();
    context.strokeStyle = palette.line;
    context.stroke();
    drawLines(context, [label], x + padding, panelY + 24, 45, headingFont, palette.ink);
  }

  let y = listY;
  wines.forEach((lines, index) => {
    drawLines(context, [String(index + 1).padStart(2, '0')], margin + padding, y + 3, 26, labelFont, palette.accent);
    drawLines(context, lines, margin + padding + 45, y, 33, listFont, palette.ink);
    y += wineHeights[index];
  });

  y = listY;
  const scoreX = scoresColumn + padding;
  report.people.forEach((person, index) => {
    drawLines(context, names[index], scoreX, y, 33, nameFont, palette.ink);
    const glassesY = y + names[index].length * 33 + 1;
    drawGlasses(context, person.score, scoreX - 4, glassesY, palette.accent);
    context.textAlign = 'right';
    drawLines(context, [`${person.score}/${report.wines.length}`], scoreX + innerWidth, glassesY, 26, labelFont, palette.accent);
    context.textAlign = 'left';
    y += scoreHeights[index];
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo crear la imagen.')), 'image/png');
  });
}

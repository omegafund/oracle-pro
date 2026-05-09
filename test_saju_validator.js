/**
 * V202.2 최종 검증 — 사장님 7개 케이스 + 사주풀이도우미·천을귀인5.22 표준
 */

// 핵심 알고리즘 동일 복제 (worker.js와 같은 로직)
function v31ToJulianDay(year, month, day, hour, minute) {
  if (typeof hour !== 'number') hour = 0;
  if (typeof minute !== 'number') minute = 0;
  let y = year, m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  let JD = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;
  JD += (hour + minute / 60) / 24;
  return JD;
}

function v31SolarLongitude(jd) {
  const T = (jd - 2451545.0) / 36525.0;
  let L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  L0 = ((L0 % 360) + 360) % 360;
  let M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  M = ((M % 360) + 360) % 360;
  const Mr = M * Math.PI / 180;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr)
          + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
          + 0.000289 * Math.sin(3 * Mr);
  const trueLon = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  return ((trueLon - 0.00569 - 0.00478 * Math.sin(omega * Math.PI / 180)) % 360 + 360) % 360;
}

function v31SolarTermJD(targetLon, year, approxMonth, approxDay) {
  let jdLow = v31ToJulianDay(year, approxMonth, approxDay - 5);
  let jdHigh = v31ToJulianDay(year, approxMonth, approxDay + 5);
  for (let i = 0; i < 60; i++) {
    const jdMid = (jdLow + jdHigh) / 2;
    const lon = v31SolarLongitude(jdMid);
    const diff = ((lon - targetLon + 540) % 360) - 180;
    if (Math.abs(diff) < 0.0001) return jdMid;
    if (diff < 0) jdLow = jdMid;
    else jdHigh = jdMid;
  }
  return (jdLow + jdHigh) / 2;
}

function v31ApplyLmtCorrection(year, month, day, hour, minute) {
  if (typeof hour !== 'number') return { year, month, day, hour, minute };
  if (typeof minute !== 'number') minute = 0;
  let totalMin = hour * 60 + minute;
  const inputDate = new Date(year, month - 1, day);
  const cutoff1961 = new Date(1961, 7, 10);
  if (inputDate >= cutoff1961) totalMin -= 30;
  
  const dst = [
    {start:[1948,5,31],end:[1948,9,12]},{start:[1949,4,2],end:[1949,9,10]},
    {start:[1950,4,1],end:[1950,5,13]},{start:[1955,5,5],end:[1955,9,8]},
    {start:[1956,5,19],end:[1956,9,29]},{start:[1957,5,4],end:[1957,9,21]},
    {start:[1958,5,3],end:[1958,9,20]},{start:[1959,5,2],end:[1959,9,19]},
    {start:[1960,5,1],end:[1960,9,17]},{start:[1987,5,10],end:[1987,10,10]},
    {start:[1988,5,8],end:[1988,10,8]}
  ];
  for (const p of dst) {
    const ps = new Date(p.start[0], p.start[1]-1, p.start[2]);
    const pe = new Date(p.end[0], p.end[1]-1, p.end[2]);
    if (inputDate >= ps && inputDate <= pe) { totalMin -= 60; break; }
  }
  
  let dayShift = 0;
  while (totalMin < 0) { totalMin += 1440; dayShift -= 1; }
  while (totalMin >= 1440) { totalMin -= 1440; dayShift += 1; }
  const newHour = Math.floor(totalMin / 60), newMin = totalMin % 60;
  if (dayShift === 0) return { year, month, day, hour: newHour, minute: newMin };
  const nd = new Date(year, month-1, day + dayShift);
  return { year: nd.getFullYear(), month: nd.getMonth()+1, day: nd.getDate(), hour: newHour, minute: newMin };
}

const STEMS = ['갑','을','병','정','무','기','경','신','임','계'];
const BRANCHES = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
const OHODUN = {갑:'병',기:'병',을:'무',경:'무',병:'경',신:'경',정:'임',임:'임',무:'갑',계:'갑'};
const OSEODUN = {갑:'갑',기:'갑',을:'병',경:'병',병:'무',신:'무',정:'경',임:'경',무:'임',계:'임'};

function getYearGanzhi(y) { const i=((y-1864)%60+60)%60; return STEMS[i%10]+BRANCHES[i%12]; }

function getMonthBranch(y, m, d, h, mi) {
  const inputJD = v31ToJulianDay(y,m,d,h,mi) - 9/24;
  const T = [{l:315,b:'인',m:2,d:4},{l:345,b:'묘',m:3,d:6},{l:15,b:'진',m:4,d:5},
             {l:45,b:'사',m:5,d:6},{l:75,b:'오',m:6,d:6},{l:105,b:'미',m:7,d:7},
             {l:135,b:'신',m:8,d:8},{l:165,b:'유',m:9,d:8},{l:195,b:'술',m:10,d:8},
             {l:225,b:'해',m:11,d:7},{l:255,b:'자',m:12,d:7},{l:285,b:'축',m:1,d:6}];
  let best=-Infinity, r='축';
  for (const t of T) { const j = v31SolarTermJD(t.l, y, t.m, t.d); if (j<=inputJD && j>best){best=j;r=t.b;}}
  if (m===1) {
    const sh = v31SolarTermJD(285, y, 1, 6);
    if (inputJD < sh) {
      const dp = v31SolarTermJD(255, y-1, 12, 7);
      r = inputJD >= dp ? '자' : '해';
    }
  }
  return r;
}

function adjustGanzhiYear(y, m, d, h, mi) {
  const inputJD = v31ToJulianDay(y,m,d,h,mi) - 9/24;
  return inputJD < v31SolarTermJD(315, y, 2, 4) ? y-1 : y;
}

function getMonthStem(ys, mb) {
  const s = OHODUN[ys]; const si = STEMS.indexOf(s); const bi = BRANCHES.indexOf(mb);
  return STEMS[(si + (bi - 2 + 12) % 12) % 10];
}

function getDayPillar(y, m, d) {
  const base = v31ToJulianDay(1900, 1, 1, 0, 0);
  const target = v31ToJulianDay(y, m, d, 0, 0);
  const diff = Math.round(target - base);
  const idx = ((10 + diff) % 60 + 60) % 60;
  return STEMS[idx % 10] + BRANCHES[idx % 12];
}

function getHourBranch(mins) {
  if (mins >= 23*60 || mins < 60) return '자';
  if (mins < 3*60) return '축';
  if (mins < 5*60) return '인';
  if (mins < 7*60) return '묘';
  if (mins < 9*60) return '진';
  if (mins < 11*60) return '사';
  if (mins < 13*60) return '오';
  if (mins < 15*60) return '미';
  if (mins < 17*60) return '신';
  if (mins < 19*60) return '유';
  if (mins < 21*60) return '술';
  return '해';
}

function getFullSaju(y, m, d, h, mi) {
  // [V202.2] 모든 4주에 LMT 보정 적용
  const lmt = v31ApplyLmtCorrection(y, m, d, h, mi);
  
  // 년주 (LMT 보정된 날짜 기준)
  const gy = adjustGanzhiYear(lmt.year, lmt.month, lmt.day, lmt.hour, lmt.minute);
  const yearGZ = getYearGanzhi(gy);
  
  // 월주 (LMT 기준)
  const monthBr = getMonthBranch(lmt.year, lmt.month, lmt.day, lmt.hour, lmt.minute);
  const monthSt = getMonthStem(yearGZ[0], monthBr);
  
  // 일주 (LMT 보정된 날짜)
  const dayGZ = getDayPillar(lmt.year, lmt.month, lmt.day);
  
  // 시주 (LMT 기준)
  const totalMin = lmt.hour * 60 + lmt.minute;
  const hourBr = getHourBranch(totalMin);
  const hourSi = STEMS.indexOf(OSEODUN[dayGZ[0]]);
  const hourSt = STEMS[(hourSi + BRANCHES.indexOf(hourBr)) % 10];
  
  return { y: yearGZ, mo: monthSt+monthBr, d: dayGZ, h: hourSt+hourBr };
}

function check(label, y,m,d,h,mi, expected) {
  const r = getFullSaju(y,m,d,h,mi);
  const actual = `${r.y} ${r.mo} ${r.d} ${r.h}`;
  const ok = actual === expected;
  console.log(`${ok ? '✅' : '❌'} ${label}`);
  console.log(`   입력 KST: ${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')} ${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}`);
  if (!ok) {
    console.log(`   기대: ${expected}`);
    console.log(`   실제: ${actual}  ⚠️`);
  } else {
    console.log(`   결과: ${actual}`);
  }
  console.log('');
  return ok;
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  V202.2 최종 검증 — 사장님 7개 실제 케이스');
console.log('  (사주풀이도우미 + 천을귀인5.22 표준)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let pass = 0, fail = 0;
check('케이스1', 1998, 4, 11, 12, 30, '무인 병진 무자 무오') ? pass++ : fail++;
check('케이스2 (고위직 검사)', 1974, 7, 16, 12, 0, '갑인 신미 무오 무오') ? pass++ : fail++;
check('케이스3 (권력형 공무원)', 1975, 5, 18, 10, 30, '을묘 신사 갑자 기사') ? pass++ : fail++;
check('케이스4', 1970, 7, 11, 7, 30, '경술 계미 임진 갑진') ? pass++ : fail++;
check('케이스5', 1973, 3, 13, 1, 2, '계축 을묘 무신 임자') ? pass++ : fail++;
check('케이스6 (히키코모리)', 2000, 7, 28, 13, 30, '경진 계미 정해 정미') ? pass++ : fail++;
check('케이스7', 1961, 6, 1, 20, 40, '신축 계사 을축 병술') ? pass++ : fail++;

// 1966-12-07 케이스 (사장님 직접 발견)
check('★ 사장님 발견 (1966-12-07 06:00 여)', 1966, 12, 7, 6, 0, '병오 기해 경자 기묘') ? pass++ : fail++;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  결과: ${pass}/${pass+fail} 정답`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

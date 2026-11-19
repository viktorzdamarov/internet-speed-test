#!/usr/bin/env node
'use strict';

/**
 * Консольный тест скорости загрузки по HTTP(S).
 * 10 последовательных GET-запросов к URL, полное чтение тела ответа.
 * Node.js 18+ (встроенный fetch).
 */

/** Сколько запросов выполнить подряд (без параллелизма). */
const REQUEST_COUNT = 10;

/** Сообщение об использовании и выход, если URL не передан. */
function usage() {
  console.error('Usage: node speed-test.js <url>');
  console.error('Example: node speed-test.js https://speed.cloudflare.com/__down?bytes=10000000');
  process.exit(1);
}

/** Форматирование размера в B / KiB / MiB / GiB (двоичные приставки). */
function formatBytes(bytes) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GiB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KiB`;
  }
  return `${bytes} B`;
}

/** Время одного запроса: миллисекунды или секунды. */
function formatMs(ms) {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)} s`;
  }
  return `${ms.toFixed(1)} ms`;
}

/** Скорость в Mbps (SI: 1 Mbps = 1_000_000 бит/с) для одного запроса. */
function formatMbps(bytes, ms) {
  if (ms <= 0) return 'n/a';
  const bitsPerSecond = (bytes * 8) / (ms / 1000);
  const mbps = bitsPerSecond / 1_000_000;
  return `${mbps.toFixed(2)} Mbps`;
}

/** Пропускная способность в MiB/s (1 MiB = 1024² байт/с). */
function formatMiBps(bytes, ms) {
  if (ms <= 0) return 'n/a';
  const mibPerSecond = bytes / (1024 * 1024) / (ms / 1000);
  return `${mibPerSecond.toFixed(2)} MiB/s`;
}

/**
 * Один полный цикл загрузки: GET → читаем всё тело в память → время и байты.
 */
async function downloadOnce(url) {
  const started = performance.now();
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    cache: 'no-store', // не брать ответ из кэша — измеряем реальную загрузку
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const elapsedMs = performance.now() - started;
  return { bytes: buffer.byteLength, elapsedMs };
}

async function main() {
  const url = process.argv[2];
  if (!url) usage();

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    console.error(`Invalid URL: ${url}`);
    process.exit(1);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    console.error('URL must use http: or https:');
    process.exit(1);
  }

  console.log(`Speed test: ${REQUEST_COUNT} sequential requests`);
  console.log(`URL: ${url}`);
  console.log('');

  const times = [];
  let totalBytes = 0;

  // Последовательные запросы: каждый следующий только после полной загрузки предыдущего
  for (let i = 1; i <= REQUEST_COUNT; i++) {
    process.stdout.write(`Request ${i}/${REQUEST_COUNT}... `);
    try {
      const { bytes, elapsedMs } = await downloadOnce(url);
      times.push(elapsedMs);
      totalBytes += bytes;
      console.log(
        `${formatMs(elapsedMs)}, ${formatBytes(bytes)}, ${formatMbps(bytes, elapsedMs)}`
      );
    } catch (err) {
      console.log('FAILED');
      console.error(`Error on request ${i}: ${err.message}`);
      process.exit(1);
    }
  }

  const totalMs = times.reduce((a, b) => a + b, 0);
  const avgMs = totalMs / times.length;

  // Итоговая скорость — по сумме байт и сумме времени всех 10 запросов
  console.log('');
  console.log('--- Results ---');
  console.log(`Requests:            ${REQUEST_COUNT}`);
  console.log(`Total downloaded:    ${formatBytes(totalBytes)} (${totalBytes} bytes)`);
  console.log(`Average request:     ${formatMs(avgMs)}`);
  console.log(`Total time:          ${formatMs(totalMs)}`);
  console.log(`Download speed:      ${formatMbps(totalBytes, totalMs)}  (megabits/s, SI)`);
  console.log(`Throughput:          ${formatMiBps(totalBytes, totalMs)}  (mebibytes/s)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
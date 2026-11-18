# internet-speed-test

Небольшой консольный тест скорости загрузки по HTTP(S) на Node.js (без внешних зависимостей).

Скрипт делает **10 последовательных** GET-запросов к указанному URL, каждый раз полностью скачивая тело ответа, затем считает среднее время запроса, суммарный объём и скорость загрузки.

## Требования

- **Node.js 18+** (используется встроенный `fetch`)

## Запуск

```bash
node speed-test.js <url>
```

Пример (файл ~10 МБ с Cloudflare Speed Test):

```bash
node speed-test.js "https://speed.cloudflare.com/__down?bytes=10000000"
```

Или через npm-скрипт:

```bash
npm start -- "https://speed.cloudflare.com/__down?bytes=10000000"
```

## Единицы измерения

| Показатель | Единица | Пояснение |
|---|---|---|
| Объём | B / KiB / MiB / GiB | Двоичные приставки: 1 KiB = 1024 B, 1 MiB = 1024² B |
| Время | ms / s | Миллисекунды или секунды |
| **Download speed** | **Mbps** | Мегабиты в секунду (SI): 1 Mbps = 1 000 000 бит/с |
| Throughput | MiB/s | Мебибайты в секунду: 1 MiB/s = 1024² байт/с |

Скорость считается по сумме всех байт и сумме времени всех 10 запросов:

`Mbps = (totalBytes × 8) / totalSeconds / 1_000_000`

## Пример вывода

```text
Speed test: 10 sequential requests
URL: https://speed.cloudflare.com/__down?bytes=10000000

Request 1/10... 1.25 s, 9.54 MiB, 64.12 Mbps
Request 2/10... 1.18 s, 9.54 MiB, 67.93 Mbps
...
Request 10/10... 1.22 s, 9.54 MiB, 65.70 Mbps

--- Results ---
Requests:            10
Total downloaded:    95.37 MiB (100000000 bytes)
Average request:     1.21 s
Total time:          12.10 s
Download speed:      66.12 Mbps  (megabits/s, SI)
Throughput:          7.88 MiB/s  (mebibytes/s)
```

(Конкретные числа зависят от сети и URL.)

## Замечания

- Запросы идут **последовательно** (не параллельно), чтобы измерять устойчивую скорость одного потока.
- Каждый ответ читается целиком (`arrayBuffer`), без раннего обрыва.
- Для осмысленного результата лучше брать достаточно большой файл (несколько мегабайт и больше).

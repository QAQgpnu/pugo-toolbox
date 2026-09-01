# Privacy and public boundary

## Data flow

| Data | Processing | Persistence | Analytics |
|---|---|---|---|
| Text utility input | Local JavaScript | Not persisted unless the tool explicitly offers a local record | Never sends raw text |
| Table-cleaner input | Local JavaScript | Memory only | Completely blocked |
| Photo and watermark input | Local canvas and image APIs | Temporary file; saved only after user action | Completely blocked for portrait tools |
| Cosmetic ingredient photo | WeChat on-device OCR | OCR text remains editable on the page | Completely blocked |
| Period records | Local calculation | Current-device storage | Completely blocked |
| Favorites and recent tools | Local registry IDs | Current-device storage | Fixed non-sensitive IDs only when platform analytics exists |

## Explicit exclusions

- No login or OPENID storage; the public client does not read OPENID.
- No custom backend, cloud environment, cloud function, BDA, COS, or generated-AI request.
- No API key, AppSecret, access token, Wi-Fi credential, or formal AppID.
- The public client does not call `imageVision`, BDA, or COS.
- No raw user text, image, financial input, health date, search term, or generated result enters analytics.

中文边界：公开客户端不调用 `imageVision`、BDA、COS，也不读取 OPENID。

The repository keeps a `touristappid` project template. Contributors should put their own account-specific configuration in ignored private files.

# NOXCAT Cyber Photo Generator

<p align="center">
	<img src="imgs/logo.png" alt="NOXCAT logo" width="160">
</p>

## 問題與目標

NOXCAT 將使用者照片、品牌色彩規範與角色原型整合為一致的賽博互動影像。它面向活動參與者與品牌行銷團隊，將原本需由設計師反覆製作的情境合照，縮短為一次上傳與主題選擇。

目標是在維持人物辨識度、NOXCAT 角色特徵及品牌色彩規範的前提下，生成可直接分享的系列主視覺。

## 核心功能

- 接收使用者照片與指定互動主題，生成 NOXCAT 賽博情境照。
- 固定使用色彩規範、NOXCAT 原型及兩張品牌標誌作為模型參考圖片。
- 以 `prompt.txt` 集中管理角色、材質、色彩與攝影風格規範。
- 以開始頁引導使用者開啟前置鏡頭（`facingMode: user`），拍照後完成四題互動測驗。
- 生成期間提供 5 秒預備倒數與 30 秒手勢捕捉 NOXCAT 小遊戲；目標使用 `docs/cat.png`，偵測到的手掌以 `docs/CatPaw.png` 標記。
- 遊戲結束後要求輸入暱稱並記錄分數；首頁可查看前 10 名排行榜。
- 暫時性生成錯誤會立即自動重試最多 3 次。
- 結果頁提供 QR code，掃描後可在手機下載生成圖片。
- 驗證上傳格式與大小，並處理客戶端中斷上傳的情況。

## 系統架構

```mermaid
flowchart LR
		User[使用者] --> Web[前端互動頁面]
		Web -->|HTTPS multipart POST<br/>theme + image| API[Flask API]
		API --> Prompt[prompt.txt]
		API --> References[images/<br/>color.jpg, noxcat.jpg,<br/>LOGO_1.png, LOGO_2.png]
		API -->|images.edit| OpenAI[OpenAI Images API<br/>gpt-image-1-mini]
		OpenAI -->|PNG Base64| API
		API --> Generated[generated/<br/>temporary PNG files]
		API -->|image/png + download URL| Web
		Web -->|QR code| Phone[手機下載圖片]
		Web -->|GET/POST 成績| Rank[rank.json<br/>前 10 名]
```

前端將主題代號與使用者照片傳至 `POST /api/generate`。Flask 後端讀取提示詞與四張本機參考圖，將它們加上使用者照片後傳給 OpenAI Images API，最後把生成的 PNG 與可下載網址回傳前端。前端使用該網址生成 QR code，讓手機可以下載圖片。

目前不使用資料庫；使用者原始照片不會保存，生成結果暫存於 `server/generated/` 供 QR code 下載。排行榜則持久化在 `server/rank.json`，每次送分後依分數由高至低排序，只保留前 10 筆。

## 使用技術

| 類型 | 技術／服務 | 用途 |
| --- | --- | --- |
| AI 模型 | OpenAI `gpt-image-1-mini` | 依提示詞與多張參考圖進行影像編輯與生成 |
| 前端 | HTML、CSS、JavaScript、MediaPipe Hands、QRCode.js | 開始頁、前置鏡頭、手勢遊戲、上傳、QR code 與結果呈現 |
| 後端 | Python、Flask、Hypercorn | REST API、multipart 解析、排行榜 JSON 持久化、HTTPS 服務 |
| Sponsor 技術 | OpenAI API | 圖像生成能力 |

## 安裝與執行

需求：Python 3.10 以上，以及可存取 OpenAI API 的金鑰。

```powershell
git clone https://github.com/ShadowZawa/noxcat.git
Set-Location noxcat\server

python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt

@"
API_KEY=your_openai_api_key
SERVER_IP=https://your-public-server:3022
"@ | Set-Content -Path .env
python main.py
```

服務預設監聽 `https://0.0.0.0:3022`。若使用 `start.bat`，請先將其中的 `PYTHON_EXE` 改為本機 Python 或虛擬環境的 `python.exe` 路徑。

`SERVER_IP` 是提供 QR code 掃描下載生成圖片的公開後端網址；可填完整 URL，或填入 `host:port` 由服務自動補上 `https://`。本機未設定時預設為 `https://twswapi.cloudns.nz:3022`。

API 請求範例：

```powershell
curl.exe -k -X POST "https://localhost:3022/api/generate" `
	-F "theme=cyber-fist-bump" `
	-F "image=@.\example.jpg;type=image/jpeg" `
	--output noxcat-generated.png
```

可用主題：`cyber-fist-bump`、`holographic-map`、`rooftop-watch`、`tracking-mission`、`goggles-repair`、`future-motorcycle`、`rainy-night-umbrella`、`street-rest-stop`、`access-hack`、`victory-selfie`。

## API 規範

### `POST /api/generate`

依使用者照片、選定主題與伺服器端品牌參考圖生成 PNG。請求內容類型必須為 `multipart/form-data`；瀏覽器使用 `FormData` 時不應手動設定 `Content-Type`，讓瀏覽器自動附加 boundary。

| 欄位 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| `image` | 檔案 | 是 | 使用者照片。支援 `image/jpeg`、`image/png`、`image/webp`。 |
| `theme` | 字串 | 是 | 十個可用主題代號之一。 |

伺服器依序將 `images/color.jpg`、`images/noxcat.jpg`、`images/LOGO_1.png`、`images/LOGO_2.png` 與上傳照片傳至模型。單一 HTTP 請求上限為 10 MB。

成功回應：

```http
HTTP/1.1 200 OK
Content-Type: image/png
Content-Disposition: inline; filename="noxcat-generated.png"
X-Generated-Image-Url: https://your-public-server:3022/generated/<image-id>.png
```

回應內容為 PNG binary，前端應以 `response.blob()` 讀取，而非 JSON。`X-Generated-Image-Url` 是供 QR code 使用的跨裝置下載網址；跨網域前端可由 `Access-Control-Expose-Headers` 讀取此 header。

### `GET /generated/<image-id>.png`

下載特定生成結果。此端點回傳 `image/png`，並以附件方式觸發下載。圖片名稱為隨機 UUID，且只有持有完整 URL 的使用者可存取；正式環境仍應搭配到期機制或簽名 URL。

### `GET /api/leaderboard`

取得排行榜前 10 名。成功回應：

```json
{
	"entries": [
		{
			"nickname": "NOXCAT",
			"score": 34,
			"recordedAt": "2026-09-05T09:34:10.914034+00:00"
		}
	]
}
```

### `POST /api/leaderboard`

送出遊戲分數。前端採用 `application/x-www-form-urlencoded`，避免跨網域 JSON 請求在特定 Hypercorn WSGI 環境觸發 `OPTIONS` 預檢問題；後端也相容 JSON body。

| 欄位 | 類型 | 必填 | 限制 |
| --- | --- | --- | --- |
| `nickname` | 字串 | 是 | 去除首尾與連續空白後為 1 至 20 字元。 |
| `score` | 整數 | 是 | $0$ 至 $9999$。 |

成功回傳 `201 Created` 與更新後的 `entries`。伺服器以 thread lock 保護讀寫，並先寫入 `rank.tmp` 再取代 `rank.json`，降低寫檔中斷造成資料損毀的機率。

### `OPTIONS /api/generate` 與 `OPTIONS /api/leaderboard`

用於跨網域的 CORS 預檢。成功時回傳 `204 No Content`，並包含：

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### 錯誤回應

除 `499` 外，錯誤通常回傳 JSON：

```json
{
	"error": "錯誤說明"
}
```

| 狀態碼 | `error` 值或情況 | 原因與處理方式 |
| --- | --- | --- |
| `400` | `prompt.txt is empty.` | `server/prompt.txt` 沒有提示詞內容。填入生成規範後重啟服務。 |
| `400` | `Unable to read uploaded form data.` | multipart 格式錯誤，常見原因是前端手動設定 `Content-Type` 而遺失 boundary。使用 `FormData` 直接作為 `fetch` body。 |
| `400` | `Unable to read uploaded image.` | 無法解析圖片上傳內容。確認欄位名稱為 `image`。 |
| `400` | `A valid quiz theme is required.` | 缺少 `theme`，或 theme 代號不在可用清單中。 |
| `400` | `Nickname must be between 1 and 20 characters.` | 排行榜暱稱為空白或超過 20 字元。 |
| `400` | `Score must be an integer between 0 and 9999.` | 排行榜分數格式或範圍不合法。 |
| `400` | `Missing image upload.` | 請求未附帶 `image` 檔案，或檔名為空。 |
| `400` | `Empty image upload.` | 上傳檔案大小為 0 bytes。重新選擇有效圖片。 |
| `413` | `Image must be 10 MB or smaller.` | 請求大小超過 10 MB。縮小或壓縮圖片後重試。 |
| `415` | `Unsupported image type.` | 上傳 MIME type 非 JPEG、PNG 或 WebP。轉換為支援格式。 |
| `499` | 空回應 | 客戶端在伺服器完成讀取 multipart body 前取消請求或中斷連線。確認網路穩定，並在前端不要過早取消 `fetch`。 |
| `500` | `API_KEY is not configured.` | 伺服器 `.env` 未設定 `API_KEY`，或服務未從含有 `.env` 的目錄啟動。 |
| `500` | `prompt.txt was not found.` | 服務的目前工作目錄找不到 `prompt.txt`。從 `server/` 啟動 `main.py`。 |
| `500` | `Missing required reference image: images/<file>` | `server/images/` 缺少必要的 `color.jpg`、`noxcat.jpg`、`LOGO_1.png` 或 `LOGO_2.png`。補齊檔案後重試。 |
| `502` | `Image generation failed.` | OpenAI Images API 請求失敗，例如 API key 無效、額度不足、模型暫時無法使用或網路問題。查看 server console 的 `OpenAI image generation failed` 紀錄取得詳細原因。 |
| `404` | 找不到生成圖片 | QR code 指向的圖片檔不存在，可能是伺服器清理了暫存檔，或圖片識別碼無效。重新生成後再掃描。 |

伺服器會在 console 記錄請求大小、選定主題與模型錯誤細節；不要將 API key 或使用者原始照片寫入日誌。

## 作品展示

- 作品展示網址：https://shadowzawa.github.io/noxcat/
- 評選影片：待補

### 生成範例

<p align="center">
	<img src="imgs/大頭貼.jpg" alt="使用者上傳的原始照片" width="260">
	<img src="imgs/與Notcat 雨夜同行.png" alt="NOXCAT 雨夜同行生成結果" width="260">
</p>

左圖為使用者上傳的原始照片；右圖為套用 NOXCAT 角色、品牌規範與雨夜主題後的生成結果。

## 限制與未來工作

- 生成品質與人物、角色的一致性仍受模型輸出影響，結果需要人工挑選。
- API 目前只支援 JPEG、PNG、WebP，且單一請求上限為 10 MB。
- API key 由伺服器環境變數保管；正式環境應加入身分驗證、速率限制與用量監測。
- `server/generated/` 的 QR code 下載圖片目前沒有自動清理機制；部署前應設定保存期限、排程清理或採用具到期時間的物件儲存連結。
- `server/rank.json` 是單機 JSON 儲存，適合活動原型或單一服務程序。多程序、多台機器或高併發部署應改用資料庫、共享儲存與伺服器端防作弊驗證。
- 後續可加入任務佇列、生成歷史與更細緻的前端進度回報。

## 第三方服務、資料與素材

| 項目 | 來源 | 授權或使用方式 |
| --- | --- | --- |
| OpenAI Images API | https://platform.openai.com/docs/guides/image-generation | 依 OpenAI 服務條款與帳戶用量計費使用 |
| Flask | https://flask.palletsprojects.com/ | BSD-3-Clause |
| Hypercorn | https://hypercorn.readthedocs.io/ | MIT |
| MediaPipe Hands | https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker | Apache-2.0 |
| QRCode.js | https://github.com/davidshimjs/qrcodejs | MIT |
| NOXCAT 原型、品牌色彩與標誌 | 專案團隊提供，位於 `server/images/` | 僅供本專案展示與生成流程使用 |
| 使用者照片 | 使用者上傳 | 僅在請求期間轉送模型，不由本服務持久化保存 |

請勿將 `.env`、API key、Token、私人照片或其他個人資料提交至儲存庫。

## 團隊成員

| 姓名 | 分工 |
| --- | --- |
| 待補 | 待補 |

## License

本專案採用 [Apache License 2.0](LICENSE)。

## 技術文件

完整架構、前後端狀態流程、資料合約、部署、維運與測試指引請見 [tech.md](tech.md)。

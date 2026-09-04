# NOXCAT Cyber Photo Generator

## 問題與目標

NOXCAT 將使用者照片、品牌色彩規範與角色原型整合為一致的賽博互動影像。它面向活動參與者與品牌行銷團隊，將原本需由設計師反覆製作的情境合照，縮短為一次上傳與主題選擇。

目標是在維持人物辨識度、NOXCAT 角色特徵及品牌色彩規範的前提下，生成可直接分享的系列主視覺。

## 核心功能

- 接收使用者照片與指定互動主題，生成 NOXCAT 賽博情境照。
- 固定使用色彩規範、NOXCAT 原型及兩張品牌標誌作為模型參考圖片。
- 以 `prompt.txt` 集中管理角色、材質、色彩與攝影風格規範。
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
		API -->|image/png| Web
```

前端將主題代號與使用者照片傳至 `POST /api/generate`。Flask 後端讀取提示詞與四張本機參考圖，將它們加上使用者照片後傳給 OpenAI Images API，最後把生成的 PNG 回傳前端。目前不使用資料庫，也不持久化使用者照片或生成結果。

## 使用技術

| 類型 | 技術／服務 | 用途 |
| --- | --- | --- |
| AI 模型 | OpenAI `gpt-image-1-mini` | 依提示詞與多張參考圖進行影像編輯與生成 |
| 前端 | 外部網站前端 | 上傳照片、選擇主題與顯示生成結果 |
| 後端 | Python、Flask、Hypercorn | REST API、multipart 解析、HTTPS 服務 |
| Sponsor 技術 | OpenAI API | 圖像生成能力 |

## 安裝與執行

需求：Python 3.10 以上，以及可存取 OpenAI API 的金鑰。

```powershell
git clone <repository-url>
Set-Location <repository-folder>\server

python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt

Set-Content -Path .env -Value "API_KEY=your_openai_api_key"
python main.py
```

服務預設監聽 `https://0.0.0.0:3022`。若使用 `start.bat`，請先將其中的 `PYTHON_EXE` 改為本機 Python 或虛擬環境的 `python.exe` 路徑。

API 請求範例：

```powershell
curl.exe -k -X POST "https://localhost:3022/api/generate" `
	-F "theme=cyber-fist-bump" `
	-F "image=@.\example.jpg;type=image/jpeg" `
	--output noxcat-generated.png
```

可用主題：`cyber-fist-bump`、`holographic-map`、`rooftop-watch`、`tracking-mission`、`goggles-repair`、`future-motorcycle`、`rainy-night-umbrella`、`street-rest-stop`、`access-hack`、`victory-selfie`。

## 作品展示

- 作品展示網址：https://twsw.cloudns.asia/
- 評選影片：待補

## 限制與未來工作

- 生成品質與人物、角色的一致性仍受模型輸出影響，結果需要人工挑選。
- API 目前只支援 JPEG、PNG、WebP，且單一請求上限為 10 MB。
- API key 由伺服器環境變數保管；正式環境應加入身分驗證、速率限制與用量監測。
- 後續可加入任務佇列、生成歷史、結果儲存與前端進度回報。

## 第三方服務、資料與素材

| 項目 | 來源 | 授權或使用方式 |
| --- | --- | --- |
| OpenAI Images API | https://platform.openai.com/docs/guides/image-generation | 依 OpenAI 服務條款與帳戶用量計費使用 |
| Flask | https://flask.palletsprojects.com/ | BSD-3-Clause |
| Hypercorn | https://hypercorn.readthedocs.io/ | MIT |
| NOXCAT 原型、品牌色彩與標誌 | 專案團隊提供，位於 `server/images/` | 僅供本專案展示與生成流程使用 |
| 使用者照片 | 使用者上傳 | 僅在請求期間轉送模型，不由本服務持久化保存 |

請勿將 `.env`、API key、Token、私人照片或其他個人資料提交至儲存庫。

## 團隊成員

| 姓名 | 分工 |
| --- | --- |
| 待補 | 待補 |

## License

本專案採用 [Apache License 2.0](LICENSE)。

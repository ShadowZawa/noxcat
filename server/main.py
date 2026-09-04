import asyncio
import base64
import os
import sys
import traceback
from io import BytesIO
from pathlib import Path

from flask import Flask, jsonify, request, send_file
from hypercorn.asyncio import serve
from hypercorn.config import Config
from hypercorn.middleware.wsgi import AsyncioWSGIMiddleware
from openai import OpenAI
from dotenv import load_dotenv
from werkzeug.exceptions import BadRequest, ClientDisconnected


load_dotenv()
app = Flask(__name__)
MAX_IMAGE_SIZE = 10 * 1024 * 1024
app.config["MAX_CONTENT_LENGTH"] = MAX_IMAGE_SIZE

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
PROMPT_FILE = Path("prompt.txt")
IMAGES_DIRECTORY = Path("images")
REFERENCE_IMAGE_NAMES = ("color.jpg", "noxcat.jpg", "LOGO_1.png", "LOGO_2.png")
IMAGE_SUFFIX_MIME_TYPES = {
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".webp": "image/webp",
}
THEME_PROMPTS = {
	"cyber-fist-bump": "人物蹲下與 NOXCAT 碰拳；地下街霓虹巷口，中廣角品牌主視覺。",
	"holographic-map": "NOXCAT 操作 #91D500 全息地圖，人物俯身共同研究；地圖不含文字。",
	"rooftop-watch": "人物與 NOXCAT 坐在安全的高樓平台邊緣眺望未來城市；NOXCAT 尾巴自然垂落且完整可見。",
	"tracking-mission": "NOXCAT 在前方敏捷帶路，人物緊隨其後；低角度動態攝影與輕微動態模糊。",
	"goggles-repair": "人物替 NOXCAT 調整額前護目鏡，NOXCAT 抬頭注視；中近景、互動細膩。",
	"future-motorcycle": "人物駕駛黑灰未來機車，NOXCAT 坐在側車斗；橫向速度感構圖，不遮擋角色特徵。",
	"rainy-night-umbrella": "人物替 NOXCAT 撐透明科技傘並肩行走；濕地只反射 #91D500 高彩度光線。",
	"street-rest-stop": "人物靠牆喝無品牌外帶飲品，NOXCAT 坐在金屬箱上晃尾巴並與人物對望；自然抓拍感。",
	"access-hack": "人物在旁警戒，NOXCAT 用爪子操作 #91D500 控制面板；介面採抽象圖形、不含文字。",
	"victory-selfie": "人物手持相機自拍，NOXCAT 面向鏡頭舉起一隻肉球；廣角自拍視角，輕鬆活潑。",
}


@app.after_request
def add_cors_headers(response):
	response.headers["Access-Control-Allow-Origin"] = "*"
	response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
	response.headers["Access-Control-Allow-Headers"] = "Content-Type"
	return response


def load_reference_images():
	reference_images = []
	for image_name in REFERENCE_IMAGE_NAMES:
		image_path = IMAGES_DIRECTORY / image_name
		if not image_path.is_file():
			raise FileNotFoundError(image_name)
		reference_images.append((image_name, image_path.read_bytes(), "image/jpeg"))
	return reference_images


@app.route("/api/generate", methods=["POST", "OPTIONS"])
def generate_image():
	if request.method == "OPTIONS":
		return "", 204

	api_key = os.environ.get("API_KEY")
	if not api_key:
		return jsonify(error="API_KEY is not configured."), 500

	try:
		prompt = PROMPT_FILE.read_text(encoding="utf-8").strip()
	except FileNotFoundError:
		return jsonify(error="prompt.txt was not found."), 500

	if not prompt:
		return jsonify(error="prompt.txt is empty."), 400

	print(
		f"Generate request from {request.remote_addr}, content length: "
		f"{request.content_length or 0} bytes, content type: {request.content_type}",
		flush=True,
	)
	try:
		form = request.form
		images = request.files.getlist("image")
	except ClientDisconnected:
		print("Client disconnected while uploading an image.", flush=True)
		return "", 499
	except BadRequest as error:
		print(f"Malformed multipart request: {error}", flush=True)
		return jsonify(error="Unable to read uploaded form data."), 400
	except Exception as error:
		print(f"Multipart parse failed: {type(error).__name__}: {error}", flush=True)
		traceback.print_exc()
		return jsonify(error="Unable to read uploaded image."), 400

	theme_id = form.get("theme", "").strip()
	theme_prompt = THEME_PROMPTS.get(theme_id)
	if not theme_prompt:
		return jsonify(error="A valid quiz theme is required."), 400

	prompt = f"{prompt}\n\nSelected NOXCAT photo theme:\n{theme_prompt}"
	print(f"Selected theme: {theme_id}", flush=True)

	if images and any(not image.filename for image in images):
		return jsonify(error="Missing image upload."), 400

	if images and any(image.mimetype not in ALLOWED_IMAGE_TYPES for image in images):
		return jsonify(error="Unsupported image type."), 415

	try:
		image_files = load_reference_images()
	except FileNotFoundError as error:
		return jsonify(error=f"Missing required reference image: images/{error.args[0]}"), 500

	for image in images:
		image_bytes = image.read()
		if not image_bytes:
			return jsonify(error="Empty image upload."), 400
		image_files.append((image.filename, image_bytes, image.mimetype))

	if not images:
		return jsonify(error="Missing image upload."), 400

	print(f"Received {len(image_files)} image(s).", flush=True)
	try:
		response = OpenAI(api_key=api_key).images.edit(
			model="gpt-image-1-mini",
			prompt=prompt,
			image=image_files,
		)
		generated_image = response.data[0].b64_json
		return send_file(
			BytesIO(base64.b64decode(generated_image)),
			mimetype="image/png",
			as_attachment=False,
			download_name="noxcat-generated.png",
		)
	except Exception as error:
		print(f"OpenAI image generation failed: {type(error).__name__}: {error}", flush=True)
		return jsonify(error="Image generation failed."), 502


@app.errorhandler(413)
def file_too_large(_error):
	return jsonify(error="Image must be 10 MB or smaller."), 413


@app.errorhandler(ClientDisconnected)
@app.errorhandler(ConnectionResetError)
def client_disconnected(_error):
	print(f"Client disconnected: {_error}", flush=True)
	return "", 499


def handle_asyncio_exception(loop, context):
	error = context.get("exception")
	if (
		context.get("message") == "Unhandled exception in client_connected_cb"
		and isinstance(error, TimeoutError)
		and str(error) == "SSL shutdown timed out"
	):
		print("Client TLS shutdown timed out after the response was sent.", flush=True)
		return
	loop.default_exception_handler(context)


async def run_server(config):
	asyncio.get_running_loop().set_exception_handler(handle_asyncio_exception)
	await serve(AsyncioWSGIMiddleware(app, max_body_size=MAX_IMAGE_SIZE), config)


if __name__ == "__main__":
	if sys.platform == "win32":
		asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

	config = Config()
	config.bind = ["0.0.0.0:3022"]
	config.certfile = "cert/cert_chain.pem"
	config.keyfile = "cert/key.pem"
	config.keyfile_password = "123"
	config.alpn_protocols = ["http/1.1"]
	config.accesslog = "-"
	config.errorlog = "-"
	asyncio.run(run_server(config))

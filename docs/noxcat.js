const preview = document.getElementById('preview');
const app = document.querySelector('.app');
const snapshot = document.getElementById('snapshot');
const cameraShell = document.getElementById('cameraShell');
const modeBadge = document.getElementById('modeBadge');
const countdown = document.getElementById('countdown');
const startButton = document.getElementById('startButton');
const captureButton = document.getElementById('captureButton');
const downloadButton = document.getElementById('downloadButton');
const fallbackInput = document.getElementById('fallbackInput');
const introStage = document.getElementById('introStage');
const introStartButton = document.getElementById('introStartButton');
const stageIndicator = document.getElementById('stageIndicator');
const captureStage = document.getElementById('captureStage');
const questionsStage = document.getElementById('questionsStage');
const waitingStage = document.getElementById('waitingStage');
const gameStage = document.getElementById('gameStage');
const resultStage = document.getElementById('resultStage');
const questionnaire = document.getElementById('questionnaire');
const finalResult = document.getElementById('finalResult');
const finalPreview = document.getElementById('finalPreview');
const resultTitle = document.getElementById('resultTitle');
const resultTags = document.getElementById('resultTags');
const resultDescription = document.getElementById('resultDescription');
const downloadQr = document.getElementById('downloadQr');
const qrCode = document.getElementById('qrCode');
const questionSteps = [...document.querySelectorAll('.question-step')];
const questionCount = document.getElementById('questionCount');
const progressBar = document.getElementById('progressBar');
const answerOptions = [...document.querySelectorAll('.answer-option')];
const context = snapshot.getContext('2d');
const gamePreview = document.getElementById('gamePreview');
const gameCanvas = document.getElementById('gameCanvas');
const gameContext = gameCanvas.getContext('2d');
const gameTarget = document.getElementById('gameTarget');
const gameTimer = document.getElementById('gameTimer');
const gameScore = document.getElementById('gameScore');
const gameMessage = document.getElementById('gameMessage');
const gamePawImage = new Image();
gamePawImage.src = 'CatPaw.png';

const themes = {
	'cyber-fist-bump': {
		title: '賽博碰拳',
		description: '默契先到位，再一起闖進霓虹巷口。你和 NOXCAT 的第一個招呼，就是最有力的品牌主視覺。',
		prompt: '人物蹲下與 NOXCAT 碰拳；地下街霓虹巷口，中廣角品牌主視覺。'
	},
	'holographic-map': {
		title: '全息地圖探索',
		description: '你總會被未知的方向吸引。和 NOXCAT 靠近一點，下一個祕密就在眼前展開。',
		prompt: 'NOXCAT 操作 #91D500 全息地圖，人物俯身共同研究；地圖不含文字。'
	},
	'rooftop-watch': {
		title: '屋頂守望',
		description: '你享受安靜卻不孤單的時刻，和 NOXCAT 一起把未來城市收進視線。',
		prompt: '人物與 NOXCAT 坐在安全的高樓平台邊緣眺望未來城市；NOXCAT 尾巴自然垂落且完整可見。'
	},
	'tracking-mission': {
		title: '追蹤任務',
		description: '你天生想往前追，NOXCAT 已經在前方替你找到最快的路。',
		prompt: 'NOXCAT 在前方敏捷帶路，人物緊隨其後；低角度動態攝影與輕微動態模糊。'
	},
	'goggles-repair': {
		title: '修理護目鏡',
		description: '你的細心會讓冒險更可靠。這一刻不需要張揚，卻剛好足夠靠近。',
		prompt: '人物替 NOXCAT 調整額前護目鏡，NOXCAT 抬頭注視；中近景、互動細膩。'
	},
	'future-motorcycle': {
		title: '共乘未來機車',
		description: '一有想法就出發是你的節奏，NOXCAT 已經在側車斗等著風景往後退。',
		prompt: '人物駕駛黑灰未來機車，NOXCAT 坐在側車斗；橫向速度感構圖，不遮擋角色特徵。'
	},
	'rainy-night-umbrella': {
		title: '雨夜共行',
		description: '你把照顧藏在自然的小動作裡，連雨夜也因為有人同行而變得明亮。',
		prompt: '人物與 NOXCAT 並肩行走；濕地只反射 #91D500 高彩度光線。'
	},
	'street-rest-stop': {
		title: '街頭休息站',
		description: '你知道好故事不只在衝刺時發生，停下來對望的片刻也很值得收藏。',
		prompt: '人物靠牆喝無品牌外帶飲品，NOXCAT 坐在金屬箱上晃尾巴並與人物對望；自然抓拍感。'
	},
	'access-hack': {
		title: '破解門禁',
		description: '遇到封鎖時，你更想知道門後有什麼。NOXCAT 的下一步總是比你快一點。',
		prompt: '人物在旁警戒，NOXCAT 用爪子操作 #91D500 控制面板；介面採抽象圖形、不含文字。'
	},
	'victory-selfie': {
		title: '勝利合照',
		description: '你最擅長把任務結束變成新回憶。把鏡頭轉過來，和 NOXCAT 留下輕鬆的一張。',
		prompt: '人物手持相機自拍，NOXCAT 面向鏡頭舉起一隻肉球；廣角自拍視角，輕鬆活潑。'
	}
};

let mediaStream = null;
let countdownTimer = null;
let currentQuestionIndex = 0;
const answers = {};
const generateEndpoint = 'https://twswapi.cloudns.nz:3022/api/generate';
const maxGenerationAttempts = 3;
let finalImageUrl = '';
let handTracker = null;
let gameAnimationFrame = null;
let gameIsRunning = false;
let gameHasStarted = false;
let gameTargetPosition = { x: 0.5, y: 0.5 };
let gameTargetHitPending = false;

function showStage(stage) {
	introStage.hidden = stage !== introStage;
	captureStage.hidden = stage !== captureStage;
	questionsStage.hidden = stage !== questionsStage;
	waitingStage.hidden = stage !== waitingStage;
	gameStage.hidden = stage !== gameStage;
	resultStage.hidden = stage !== resultStage;

	const stageMeta = new Map([
		[captureStage, { name: 'capture', label: '01 <span>/ PHOTO</span>' }],
		[questionsStage, { name: 'questions', label: '02 <span>/ QUIZ</span>' }],
		[gameStage, { name: 'game', label: '03 <span>/ GAME</span>' }],
		[waitingStage, { name: 'waiting', label: '04 <span>/ PROCESS</span>' }],
		[resultStage, { name: 'result', label: '05 <span>/ RESULT</span>' }]
	]);
	const meta = stageMeta.get(stage);
	if (meta) {
		app.dataset.stage = meta.name;
		stageIndicator.innerHTML = meta.label;
	}
}

function setCameraState(isReady) {
	captureButton.disabled = !isReady;
	startButton.hidden = isReady;
	modeBadge.textContent = isReady ? '鏡頭預覽中' : '尚未啟用鏡頭';
	cameraShell.classList.toggle('is-ready', isReady);
}

function showQuestionnaire() {
	Object.keys(answers).forEach((key) => delete answers[key]);
	answerOptions.forEach((option) => option.classList.remove('is-selected'));
	showStage(questionsStage);
	app.classList.add('quiz-mode');
	app.classList.remove('waiting-mode', 'result-mode');
	setQuestion(0);
	questionnaire.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function setQuestion(index) {
	currentQuestionIndex = index;
	questionSteps.forEach((step, stepIndex) => {
		step.hidden = stepIndex !== currentQuestionIndex;
		step.classList.toggle('is-active', stepIndex === currentQuestionIndex);
	});

	questionCount.textContent = `第 ${currentQuestionIndex + 1} / ${questionSteps.length} 題`;
	progressBar.style.width = `${((currentQuestionIndex + 1) / questionSteps.length) * 100}%`;
}

function loadImageFile(file) {
	if (!file) {
		return;
	}

	const reader = new FileReader();
	reader.onload = () => {
		const image = new Image();
		image.onload = () => {
			snapshot.width = image.width;
			snapshot.height = image.height;
			context.drawImage(image, 0, 0, image.width, image.height);
			cameraShell.classList.add('captured');
			modeBadge.textContent = '已載入照片';
			showQuestionnaire();
		};
		image.src = reader.result;
	};

	reader.readAsDataURL(file);
}

function useDefaultPhoto() {
	snapshot.width = 900;
	snapshot.height = 1200;

	const gradient = context.createLinearGradient(0, 0, snapshot.width, snapshot.height);
	gradient.addColorStop(0, '#101820');
	gradient.addColorStop(1, '#34424b');
	context.fillStyle = gradient;
	context.fillRect(0, 0, snapshot.width, snapshot.height);

	context.fillStyle = '#91D500';
	context.beginPath();
	context.arc(450, 430, 150, 0, Math.PI * 2);
	context.fill();
	context.fillRect(260, 600, 380, 260);

	context.fillStyle = '#101820';
	context.font = 'bold 52px sans-serif';
	context.textAlign = 'center';
	context.fillText('NOXCAT', 450, 960);
	context.font = '32px sans-serif';
	context.fillText('PHOTO EXPERIENCE', 450, 1015);

	cameraShell.classList.add('captured');
	modeBadge.textContent = '預設照片';
	showQuestionnaire();
}

async function stopCamera() {
	if (!mediaStream) {
		return;
	}

	mediaStream.getTracks().forEach((track) => track.stop());
	mediaStream = null;
	preview.srcObject = null;
	setCameraState(false);
}

async function startCamera() {
	if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
		useDefaultPhoto();
		return;
	}

	if (!window.isSecureContext) {
		useDefaultPhoto();
		return;
	}

	startButton.onclick = null;

	cameraShell.classList.remove('captured');
	app.classList.remove('intro-mode', 'quiz-mode', 'waiting-mode', 'result-mode');
	showStage(captureStage);

	try {
		await stopCamera();

		mediaStream = await navigator.mediaDevices.getUserMedia({
			video: {
				facingMode: { ideal: 'user' }
			},
			audio: false
		});

		preview.srcObject = mediaStream;
		await preview.play();
		setCameraState(true);
	} catch (error) {
		console.error(error);
		useDefaultPhoto();
	}
}

function startExperience() {
	app.classList.remove('intro-mode');
	startCamera();
}

function capturePhoto() {
	if (!mediaStream || !preview.videoWidth || !preview.videoHeight) {
		return;
	}

	snapshot.width = preview.videoWidth;
	snapshot.height = preview.videoHeight;
	context.drawImage(preview, 0, 0, snapshot.width, snapshot.height);

	cameraShell.classList.add('captured');
	modeBadge.textContent = '照片已拍攝';
	showQuestionnaire();
}

function startCountdown() {
	if (countdownTimer || captureButton.disabled) {
		return;
	}

	let remaining = 5;
	captureButton.disabled = true;
	countdown.textContent = remaining;

	countdownTimer = window.setInterval(() => {
		remaining -= 1;
		countdown.textContent = remaining > 0 ? remaining : '';

		if (remaining <= 0) {
			window.clearInterval(countdownTimer);
			countdownTimer = null;
			capturePhoto();
		}
	}, 1000);
}

function createImageBlob(canvas, type, quality) {
	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) {
				resolve(blob);
				return;
			}

			reject(new Error('無法建立照片檔案。'));
		}, type, quality);
	});
}

async function canvasToUploadBlob() {
	const maxUploadSize = 1.5 * 1024 * 1024;
	const dimensions = [1280, 960, 720];
	const formats = [
		{ type: 'image/webp', quality: 0.8 },
		{ type: 'image/jpeg', quality: 0.76 }
	];

	let smallestBlob = null;
	for (const maxDimension of dimensions) {
		const scale = Math.min(1, maxDimension / Math.max(snapshot.width, snapshot.height));
		const uploadCanvas = document.createElement('canvas');
		uploadCanvas.width = Math.round(snapshot.width * scale);
		uploadCanvas.height = Math.round(snapshot.height * scale);
		uploadCanvas.getContext('2d').drawImage(snapshot, 0, 0, uploadCanvas.width, uploadCanvas.height);

		for (const format of formats) {
			const blob = await createImageBlob(uploadCanvas, format.type, format.quality);
			if (!smallestBlob || blob.size < smallestBlob.size) {
				smallestBlob = blob;
			}
			if (blob.type === format.type && blob.size <= maxUploadSize) {
				return blob;
			}
		}
	}

	return smallestBlob;
}

function moveGameTarget() {
	gameTarget.classList.remove('is-near', 'is-hit');
	gameTargetHitPending = false;
	gameTargetPosition = {
		x: 0.16 + Math.random() * 0.68,
		y: 0.18 + Math.random() * 0.60
	};
	gameTarget.style.left = `${gameTargetPosition.x * 100}%`;
	gameTarget.style.top = `${gameTargetPosition.y * 100}%`;
}

function resizeGameCanvas() {
	const width = gamePreview.videoWidth || 720;
	const height = gamePreview.videoHeight || 960;
	if (gameCanvas.width !== width || gameCanvas.height !== height) {
		gameCanvas.width = width;
		gameCanvas.height = height;
	}
}

function drawGameHand(results) {
	resizeGameCanvas();
	gameContext.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
	const landmarks = results.multiHandLandmarks?.[0];
	if (!landmarks || !gameIsRunning) {
		return;
	}

	const palm = landmarks[9];
	const palmX = 1 - palm.x;
	const palmY = palm.y;
	const markerSize = 88;
	gameContext.drawImage(
		gamePawImage,
		palmX * gameCanvas.width - markerSize / 2,
		palmY * gameCanvas.height - markerSize / 2,
		markerSize,
		markerSize
	);

	const targetDistance = Math.hypot(palmX - gameTargetPosition.x, palmY - gameTargetPosition.y);
	gameTarget.classList.toggle('is-near', gameHasStarted && targetDistance < 0.22);

	if (gameHasStarted && !gameTargetHitPending && targetDistance < 0.13) {
		gameTargetHitPending = true;
		gameScore.textContent = String(Number(gameScore.textContent) + 1);
		gameMessage.textContent = '捕捉成功！繼續找 NOXCAT';
		gameTarget.classList.add('is-hit');
		window.setTimeout(moveGameTarget, 220);
	}
}

async function trackHands() {
	if (!gameIsRunning || !handTracker || gamePreview.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
		return;
	}
	try {
		await handTracker.send({ image: gamePreview });
	} catch (error) {
		console.warn('Hand tracking unavailable.', error);
	}
	if (gameIsRunning) {
		gameAnimationFrame = window.requestAnimationFrame(trackHands);
	}
}

function createHandTracker() {
	if (handTracker || !window.Hands) {
		return handTracker;
	}

	handTracker = new window.Hands({
		locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
	});
	handTracker.setOptions({
		maxNumHands: 1,
		modelComplexity: 0,
		minDetectionConfidence: 0.6,
		minTrackingConfidence: 0.6
	});
	handTracker.onResults(drawGameHand);
	return handTracker;
}

function stopCatchGame() {
	gameIsRunning = false;
	gameHasStarted = false;
	if (gameAnimationFrame) {
		window.cancelAnimationFrame(gameAnimationFrame);
		gameAnimationFrame = null;
	}
	gamePreview.srcObject = null;
	gameContext.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
	gameTarget.classList.remove('is-near', 'is-hit');
	gameTargetHitPending = false;
}

function runGameCountdown(seconds) {
	gameTimer.textContent = String(seconds);
	gameMessage.textContent = '準備捕捉 NOXCAT';

	return new Promise((resolve) => {
		let remaining = seconds;
		const timer = window.setInterval(() => {
			remaining -= 1;
			gameTimer.textContent = String(remaining);
			if (remaining <= 0) {
				window.clearInterval(timer);
				resolve();
			}
		}, 1000);
	});
}

async function playCatchGame() {
	showStage(gameStage);
	gameScore.textContent = '0';
	gameTarget.hidden = false;
	gameCanvas.hidden = false;
	moveGameTarget();

	if (mediaStream && createHandTracker()) {
		gamePreview.srcObject = mediaStream;
		await gamePreview.play();
		gameIsRunning = true;
		gameAnimationFrame = window.requestAnimationFrame(trackHands);
	} else {
		gameMessage.textContent = '鏡頭或手部追蹤未就緒，圖片仍在生成中';
	}
	await runGameCountdown(5);
	gameTimer.textContent = '30';
	gameMessage.textContent = '用手掌碰觸 NOXCAT';
	gameHasStarted = true;

	return new Promise((resolve) => {
		let remaining = 30;
		const timer = window.setInterval(() => {
			remaining -= 1;
			gameTimer.textContent = String(remaining);
			if (remaining <= 0) {
				window.clearInterval(timer);
				stopCatchGame();
				resolve();
			}
		}, 1000);
	});
}

async function requestGeneratedPhoto(themeId, result) {
	const photo = await canvasToUploadBlob();
	const extension = photo.type === 'image/webp' ? 'webp' : 'jpg';

	for (let attempt = 1; attempt <= maxGenerationAttempts; attempt += 1) {
		try {
			const formData = new FormData();
			formData.append('image', photo, `noxcat-photo.${extension}`);
			formData.append('theme', themeId);
			formData.append('themeTitle', result.title);
			formData.append('themePrompt', result.prompt);
			formData.append('quizAnswers', JSON.stringify(answers));

			const response = await fetch(generateEndpoint, { method: 'POST', body: formData });
			if (!response.ok) {
				const error = new Error(`照片生成失敗 (${response.status})。`);
				error.retryable = response.status === 429 || response.status >= 500;
				throw error;
			}

			const generatedImage = await response.blob();
			if (!generatedImage.type.startsWith('image/')) {
				const error = new Error('伺服器未回傳圖片。');
				error.retryable = true;
				throw error;
			}
			return {
				blob: generatedImage,
				downloadUrl: response.headers.get('X-Generated-Image-Url')
			};
		} catch (error) {
			const canRetry = error.retryable !== false && attempt < maxGenerationAttempts;
			if (!canRetry) {
				throw error;
			}
			console.warn(`Image generation failed; retrying (${attempt + 1}/${maxGenerationAttempts}).`, error);
			if (!gameStage.hidden) {
				gameMessage.textContent = `生成連線重試中 ${attempt + 1}/${maxGenerationAttempts}`;
			}
		}
	}
}

async function generateFinalPhoto() {
	const themeId = answers.memory.theme;
	const result = themes[themeId];

	app.classList.remove('quiz-mode');
	app.classList.add('waiting-mode');
	let generationFinished = false;
	const generation = requestGeneratedPhoto(themeId, result)
		.then((generatedImage) => ({ generatedImage }))
		.catch((error) => ({ error }))
		.finally(() => {
			generationFinished = true;
		});
	const game = playCatchGame();

	try {
		console.log('Generating final photo...');
		await game;
		if (!generationFinished) {
			showStage(waitingStage);
		}
		const { generatedImage, error } = await generation;
		if (error) {
			throw error;
		}

		if (finalImageUrl) {
			URL.revokeObjectURL(finalImageUrl);
		}

		finalImageUrl = URL.createObjectURL(generatedImage.blob);
		finalPreview.src = finalImageUrl;
		if (generatedImage.downloadUrl && window.QRCode) {
			qrCode.replaceChildren();
			new window.QRCode(qrCode, {
				text: generatedImage.downloadUrl,
				width: 144,
				height: 144,
				colorDark: '#101820',
				colorLight: '#F6F6F6',
				correctLevel: window.QRCode.CorrectLevel.M
			});
			downloadQr.hidden = false;
		} else {
			downloadQr.hidden = true;
		}
		resultTitle.textContent = result.title;
		resultTags.innerHTML = Object.values(answers).map(({ answer }) => `<span>${answer}</span>`).join('');
		resultDescription.textContent = result.description;
	} catch (error) {
		console.error(error);
		finalPreview.src = snapshot.toDataURL('image/png');
		resultTitle.textContent = '照片已準備好';
		resultTags.innerHTML = '';
		resultDescription.textContent = '目前無法連線，先保留你的原始照片。';
		downloadQr.hidden = true;
	}

	app.classList.remove('quiz-mode');
	app.classList.remove('waiting-mode');
	app.classList.add('result-mode');
	showStage(resultStage);
	finalResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function downloadPhoto() {
	if (!finalPreview.src) {
		return;
	}

	const link = document.createElement('a');
	link.href = finalPreview.src;
	link.download = 'noxcat-final-photo.png';
	link.click();
}

startButton.addEventListener('click', startCamera);
introStartButton.addEventListener('click', startExperience);
captureButton.addEventListener('click', startCountdown);
downloadButton.addEventListener('click', downloadPhoto);
answerOptions.forEach((option) => {
	option.addEventListener('click', () => {
		const { field, answer, theme } = option.dataset;
		answers[field] = { answer, theme };
		option.closest('.answer-options').querySelectorAll('.answer-option').forEach((item) => {
			item.classList.toggle('is-selected', item === option);
		});

		window.setTimeout(() => {
			if (currentQuestionIndex === questionSteps.length - 1) {
				generateFinalPhoto();
				return;
			}

			setQuestion(currentQuestionIndex + 1);
		}, 220);
	});
});
fallbackInput.addEventListener('change', (event) => {
	const [file] = event.target.files;
	loadImageFile(file);
	fallbackInput.value = '';
});

setQuestion(0);

window.addEventListener('beforeunload', () => {
	stopCamera();
});

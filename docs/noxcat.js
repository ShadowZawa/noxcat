const preview = document.getElementById('preview');
const app = document.querySelector('.app');
const snapshot = document.getElementById('snapshot');
const cameraShell = document.getElementById('cameraShell');
const modeBadge = document.getElementById('modeBadge');
const countdown = document.getElementById('countdown');
const startButton = document.getElementById('startButton');
const captureButton = document.getElementById('captureButton');
const retakeButton = document.getElementById('retakeButton');
const downloadButton = document.getElementById('downloadButton');
const fallbackInput = document.getElementById('fallbackInput');
const captureStage = document.getElementById('captureStage');
const questionsStage = document.getElementById('questionsStage');
const waitingStage = document.getElementById('waitingStage');
const resultStage = document.getElementById('resultStage');
const questionnaire = document.getElementById('questionnaire');
const finalResult = document.getElementById('finalResult');
const finalPreview = document.getElementById('finalPreview');
const resultTitle = document.getElementById('resultTitle');
const resultTags = document.getElementById('resultTags');
const resultDescription = document.getElementById('resultDescription');
const questionSteps = [...document.querySelectorAll('.question-step')];
const questionCount = document.getElementById('questionCount');
const progressBar = document.getElementById('progressBar');
const answerOptions = [...document.querySelectorAll('.answer-option')];
const context = snapshot.getContext('2d');

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
let finalImageUrl = '';

function showStage(stage) {
	captureStage.hidden = stage !== captureStage;
	questionsStage.hidden = stage !== questionsStage;
	waitingStage.hidden = stage !== waitingStage;
	resultStage.hidden = stage !== resultStage;
}

function setCameraState(isReady) {
	captureButton.disabled = !isReady;
	startButton.textContent = isReady ? '重新啟用鏡頭' : '啟用鏡頭';
	modeBadge.textContent = isReady ? '鏡頭預覽中' : '尚未啟用鏡頭';
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
			retakeButton.disabled = false;
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
	retakeButton.disabled = false;
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
	retakeButton.disabled = true;
	app.classList.remove('quiz-mode', 'waiting-mode', 'result-mode');
	showStage(captureStage);

	try {
		await stopCamera();

		mediaStream = await navigator.mediaDevices.getUserMedia({
			video: {
				facingMode: { ideal: 'environment' }
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

function capturePhoto() {
	if (!mediaStream || !preview.videoWidth || !preview.videoHeight) {
		return;
	}

	snapshot.width = preview.videoWidth;
	snapshot.height = preview.videoHeight;
	context.drawImage(preview, 0, 0, snapshot.width, snapshot.height);

	cameraShell.classList.add('captured');
	modeBadge.textContent = '照片已拍攝';
	retakeButton.disabled = false;
	showQuestionnaire();
}

function startCountdown() {
	if (countdownTimer || captureButton.disabled) {
		return;
	}

	let remaining = 5;
	captureButton.disabled = true;
	startButton.disabled = true;
	retakeButton.disabled = true;
	countdown.textContent = remaining;

	countdownTimer = window.setInterval(() => {
		remaining -= 1;
		countdown.textContent = remaining > 0 ? remaining : '';

		if (remaining <= 0) {
			window.clearInterval(countdownTimer);
			countdownTimer = null;
			startButton.disabled = false;
			capturePhoto();
		}
	}, 1000);
}

function retakePhoto() {
	if (!mediaStream) {
		useDefaultPhoto();
		return;
	}

	cameraShell.classList.remove('captured');
	modeBadge.textContent = '鏡頭預覽中';
	retakeButton.disabled = true;
	app.classList.remove('quiz-mode', 'waiting-mode', 'result-mode');
	showStage(captureStage);
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

async function generateFinalPhoto() {
	const themeId = answers.memory.theme;
	const result = themes[themeId];

	app.classList.remove('quiz-mode');
	app.classList.add('waiting-mode');
	showStage(waitingStage);

	try {
        console.log('Generating final photo...');
		const photo = await canvasToUploadBlob();
		const formData = new FormData();
		const extension = photo.type === 'image/webp' ? 'webp' : 'jpg';
		formData.append('image', photo, `noxcat-photo.${extension}`);
		formData.append('theme', themeId);
		formData.append('themeTitle', result.title);
		formData.append('themePrompt', result.prompt);
		formData.append('quizAnswers', JSON.stringify(answers));

		const response = await fetch(generateEndpoint, {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			throw new Error('照片生成失敗。');
		}

		const generatedImage = await response.blob();
		if (!generatedImage.type.startsWith('image/')) {
			throw new Error('伺服器未回傳圖片。');
		}

		if (finalImageUrl) {
			URL.revokeObjectURL(finalImageUrl);
		}

		finalImageUrl = URL.createObjectURL(generatedImage);
		finalPreview.src = finalImageUrl;
		resultTitle.textContent = result.title;
		resultTags.innerHTML = Object.values(answers).map(({ answer }) => `<span>${answer}</span>`).join('');
		resultDescription.textContent = result.description;
	} catch (error) {
		console.error(error);
		finalPreview.src = snapshot.toDataURL('image/png');
		resultTitle.textContent = '照片已準備好';
		resultTags.innerHTML = '';
		resultDescription.textContent = '目前無法連線，先保留你的原始照片。';
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
captureButton.addEventListener('click', startCountdown);
retakeButton.addEventListener('click', retakePhoto);
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

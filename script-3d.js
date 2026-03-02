import * as THREE from './three-155-min.js';
import { OrbitControls } from './orbit-controls.js';

export const mainScript = {
	_init: function (props, data) {
		// settings
		let containerCanvas = null, 
		container = document.querySelector('.main-cont'),
		scene = null, 
		camera = null, 
		renderer = null, 
		controls = null,
		throttleResize = false,
		worldWidth = 2500,
		worldDepth = 1400,
		myreq = null,
		options = { backgroundColor: 0x000000 };

		let framepositions = 6;
		let currentDevice = 'desktop'; // 'desktop' or 'mobile'
		let savedPositions = {
			desktop: Array(framepositions).fill(null).map(() => ({ 
				camera: { x: 0, y: 1500, z: 2500 }, 
				target: { x: 0, y: 0, z: 0 } 
			})),
			mobile: Array(framepositions).fill(null).map(() => ({ 
				camera: { x: 0, y: 1500, z: 2500 }, 
				target: { x: 0, y: 0, z: 0 } 
			}))
		};

		let ui = document.querySelector('.ui');

		// Add device selector
		let deviceSelector = document.createElement('div');
		deviceSelector.classList.add('device-selector');
		deviceSelector.innerHTML = `
			<label><input type="radio" name="device" value="desktop" checked> Desktop</label>
			<label><input type="radio" name="device" value="mobile"> Mobile</label>
		`;
		ui.appendChild(deviceSelector);

		// Add frame position controls
		for (let i = 0; i < framepositions; i++) {
			let el = document.createElement('div');
			el.classList.add('framepos');
			let radio = document.createElement('input');
			radio.type = 'radio';
			radio.name = 'frameposition';
			radio.value = i;
			radio.id = `framepos-${i}`;
			if (i === 0) radio.checked = true;
			el.appendChild(radio);
			let label = document.createElement('label');
			label.htmlFor = `framepos-${i}`;
			label.textContent = (i+1);
			el.appendChild(label);
			ui.appendChild(el);
		}

		// Add save/load buttons
		let buttonContainer = document.createElement('div');
		buttonContainer.classList.add('controls');

		
		buttonContainer.innerHTML = `
			<button id="savePosition">Save</button>
			<button id="exportAll">Export</button>
			<button id="importAll">Import</button>
		`;
		ui.appendChild(buttonContainer);

		let ogwidth = window.innerWidth;
		const onWindowResize = () => {
			if (!throttleResize) {
				if (ogwidth !== window.innerWidth) {
					const width = window.innerWidth;
					const height = window.innerHeight;
					ogwidth = width;

					renderer.setSize(width, height);
					camera.aspect = width / height;
					camera.updateProjectionMatrix();

					setTimeout(function () {
						throttleResize = false;
					}, 150);
				}
			}
		};

		const getCurrentFrameIndex = () => {
			const selected = document.querySelector('input[name="frameposition"]:checked');
			return selected ? parseInt(selected.value) : 0;
		};

		const savePosition = () => {
			const frameIndex = getCurrentFrameIndex();
			savedPositions[currentDevice][frameIndex] = {
				camera: {
					x: camera.position.x,
					y: camera.position.y,
					z: camera.position.z
				},
				target: {
					x: controls.target.x,
					y: controls.target.y,
					z: controls.target.z
				}
			};
			console.log(`Saved ${currentDevice} position for frame ${frameIndex}:`, savedPositions[currentDevice][frameIndex]);
			// alert(`Position saved for ${currentDevice} frame ${frameIndex + 1}`);
		};

		const loadPosition = () => {
			let frameIndex = getCurrentFrameIndex();
			let pos = savedPositions[currentDevice][frameIndex];

			if (!pos) {
				pos = {
					camera: { x: 0, y: 1500, z: 2500 },
					target: { x: 0, y: 0, z: 0 }
				}
			}

			camera.position.set(pos.camera.x, pos.camera.y, pos.camera.z);
			controls.target.set(pos.target.x, pos.target.y, pos.target.z);
			controls.update();
			console.log(`Loaded ${currentDevice} position for frame ${frameIndex}:`, pos);
		};

		// const exportPositions = () => {
		// 	const json = JSON.stringify(savedPositions, null, 2);
		// 	const blob = new Blob([json], { type: 'application/json' });
		// 	const url = URL.createObjectURL(blob);
		// 	const a = document.createElement('a');
		// 	a.href = url;
		// 	a.download = 'camera-positions.json';
		// 	a.click();
		// 	URL.revokeObjectURL(url);
		// };

		async function exportPositions() {

			const frameIndex = getCurrentFrameIndex();
			savedPositions[currentDevice][frameIndex] = {
				camera: {
					x: camera.position.x,
					y: camera.position.y,
					z: camera.position.z
				},
				target: {
					x: controls.target.x,
					y: controls.target.y,
					z: controls.target.z
				}
			};
				console.log(`Saved ${currentDevice} position for frame ${frameIndex}:`, savedPositions[currentDevice][frameIndex]);

			const json = JSON.stringify(savedPositions, null, 2);

			// User chooses location (you can navigate into your repo)
			const handle = await window.showSaveFilePicker({
				suggestedName: "camera-positions.json",
				types: [
				{
					description: "JSON",
					accept: { "application/json": [".json"] },
				},
				],
			});

			const writable = await handle.createWritable();
			await writable.write(json);
			await writable.close();
		}

		const importPositions = () => {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = 'application/json';
			input.onchange = (e) => {
				const file = e.target.files[0];
				const reader = new FileReader();
				reader.onload = (event) => {
					try {
						savedPositions = JSON.parse(event.target.result);
						alert('Positions imported successfully!');
					} catch (err) {
						alert('Error importing positions: ' + err.message);
					}
				};
				reader.readAsText(file);
			};
			input.click();
		};

		// Event listeners
		document.querySelectorAll('input[name="device"]').forEach(radio => {
			radio.addEventListener('change', (e) => {
				currentDevice = e.target.value;
				loadPosition(); // Auto-load position when switching device
			});
		});

		document.querySelectorAll('input[name="frameposition"]').forEach(radio => {
			radio.addEventListener('change', () => {
				loadPosition(); // Auto-load position when switching frame
			});
		});

		document.getElementById('savePosition').addEventListener('click', savePosition);
		// document.getElementById('loadPosition').addEventListener('click', loadPosition);
		document.getElementById('exportAll').addEventListener('click', exportPositions);
		document.getElementById('importAll').addEventListener('click', importPositions);

		const trail = {};

		const setupScene = () => {
			const width = window.innerWidth;
			const height = window.innerHeight;

			scene = new THREE.Scene();
			camera = new THREE.PerspectiveCamera(35, width / height, 1e-6, 1e27);

			renderer = new THREE.WebGLRenderer({
				logarithmicDepthBuffer: true,
				antialias: true,
				alpha: true
			});
			renderer.shadowMap.enabled = true;
			renderer.toneMapping = THREE.ACESFilmicToneMapping;
			renderer.setClearColor(new THREE.Color(options.backgroundColor));
			renderer.setPixelRatio(window.devicePixelRatio);
			renderer.setSize(window.innerWidth, window.innerHeight);
			containerCanvas = renderer.domElement;
			container.appendChild(containerCanvas);

			controls = new OrbitControls(camera, containerCanvas);
			controls.panSpeed = 20.0;

			camera.position.set(0, 1500, 2500);
			controls.target.set(0, 0, 0);
			controls.update();
		};

		const setupLights = () => {
			const ambient = new THREE.AmbientLight(0xffffff, 2, 0);
			scene.add(ambient);

			var light = new THREE.DirectionalLight(0xffffff, 2);
			light.position.set(0, 100, 100);
			scene.add(light);
		};

		const loadTexture = (feature) => {
			const positionLoader = new THREE.TextureLoader();
			let imguse = "path.png";
			positionLoader.load(imguse, function (texture) {
				texture.minFilter = THREE.NearestFilter;
				texture.magFilter = THREE.NearestFilter;
				feature.material.uniforms.uImageWritingPosition.value = texture;
				feature.material.uniforms.uFrames.value = 1;
			});

			const displacementLoader = new THREE.TextureLoader();
			displacementLoader.load("dem.jpg", function (texture) {
				feature.material.uniforms.uDisplacementMap.value = texture;
				feature.material.uniforms.uDisplacementStrength.value = 100.0;
			});

			const mapbaseLoader = new THREE.TextureLoader();
			let mapbaseuse = "mapbase.png";
			mapbaseLoader.load(mapbaseuse, function (texture) {
				feature.material.uniforms.uMixImage.value = texture;
				feature.material.uniforms.uMixStrength.value = 0.5;
			});
		};

		const addPath = () => {
			const group = new THREE.Group();
			const material = shaderShapes(trail);
			const geo = new THREE.PlaneGeometry(worldWidth, worldDepth, 100, 100);
			geo.computeVertexNormals();
			const mesh = new THREE.Mesh(geo, material);
			mesh.position.set(0, 0, 0);
			mesh.rotation.x = -Math.PI / 2;
			mesh.castShadow = true;
			material.transparent = true;
			trail.material = material;
			loadTexture(trail);
			group.add(mesh);
			scene.add(group);
		};

		const shaderShapes = () => {
			var material = new THREE.ShaderMaterial({
				uniforms: {
					uDisplacementMap: { value: null, type: "t" },
					uDisplacementStrength: { value: 100.0 },
					uMixImage: { value: null, type: "t" },
					uMixStrength: { value: 0.0 },
					bboxMin: { value: [0.0, 0.0, 0.0] },
					bboxMax: { value: [worldWidth, worldDepth, 1.0] },
					uSection: { value: 0.0 },
					uHasWritten: { value: 0.0 },
					uImageWritingPosition: { value: null, type: "t" },
					uImageWritingColor: { value: null, type: "t" },
					uFrames: { value: 1.0 },
					uDrawPct: { value: 0.0 },
					uDrawPctAdj: { value: 0.0 },
					uDistance: { value: 1000 },
					uIsClear: { value: 0.0 }
				},
				vertexShader: `
			  uniform vec3 bboxMin;
			  uniform vec3 bboxMax;
			  uniform sampler2D uDisplacementMap;
			  uniform float uDisplacementStrength;
			  uniform sampler2D uMixImage;
			  uniform float uMixStrength; 

			  varying vec2 vUv;
			  varying vec2 vTexCoord;
		  
			  void main() {
				vTexCoord = uv;

				float displacement = texture2D(uDisplacementMap, vUv).r;
				vec3 normalizedNormal = normalize(normal);
				vec3 displacedPosition = position + normalizedNormal * displacement * uDisplacementStrength;

				gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition,1.0);
			  }
			`,
				fragmentShader: `
			  uniform vec3 color1;
			  uniform vec3 color2;
			  uniform sampler2D uDisplacementMap;
			  uniform sampler2D uImageWritingPosition;
			  uniform sampler2D uImageWritingColor;
			  uniform sampler2D uMixImage;
			  uniform float uMixStrength; 
			  uniform float uDrawPct;
			  uniform float uDrawPctAdj;
			  uniform vec2 uTexCoord;
			  uniform float uFrames;
			  uniform float uDistance;
			  uniform float uIsClear;
		
			  varying vec2 vTexCoord;
			  varying vec2 vUv;
			  
			  void main() {
				vec4 tex2D = texture2D (uImageWritingPosition, vTexCoord);
				vec4 color2D = texture2D (uImageWritingColor, vTexCoord);

				vec3 blended = vec3(color2D.r, color2D.g, color2D.b); 
				vec4 textColor = vec4 (blended, tex2D.b);

				float red = tex2D.r;
				float green = tex2D.g;
				float pixelPct = ((red * 255.0) + (green * 65280.0)) / uFrames;
			  
				vec4 outColor = red + green > 0.0 && uDrawPct > pixelPct ? textColor :  vec4(255.0, 255.0, 255.0, 0.0);

				vec4 mixImageColor = texture2D(uMixImage, vTexCoord);

				float foregroundAlpha = outColor.a;

				vec3 finalRGB = mixImageColor.rgb * (1.0 - foregroundAlpha) + outColor.rgb * foregroundAlpha;
				float finalAlpha = max(mixImageColor.a, foregroundAlpha);

				float displacement = texture2D(uDisplacementMap, vTexCoord).r;
				finalRGB += displacement * 0.1;

				gl_FragColor = vec4(finalRGB, finalAlpha);
			  }
			`,
				wireframe: false,
				side: THREE.FrontSide
			});

			return material;
		};

		const animate = () => {
			myreq = requestAnimationFrame(animate);
			if (controls) controls.update();
			renderer.render(scene, camera);
		};

		setupScene();
		setupLights();
		addPath();

		window.addEventListener('resize', onWindowResize);

		cancelAnimationFrame(myreq);
		animate();
	},
	get init() {
		return this._init;
	},
	set init(value) {
		this._init = value;
	},
};

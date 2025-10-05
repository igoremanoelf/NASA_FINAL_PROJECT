document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('prediction-form');
    const predictButton = document.getElementById('predict-button');
    const reportPlanetName = document.getElementById('report-planet-name');
    const reportContent = document.getElementById('report-content');
    const chartContent = document.getElementById('chart-content');
    const presetContainer = document.getElementById('preset-planets-container');

    const presetExoplanets = {
        "Kepler-22b": {
            name: "Kepler-22b", koi_fpflag_nt: 0, koi_fpflag_ss: 0, koi_fpflag_co: 0, koi_fpflag_ec: 0, koi_period: 289.86, koi_duration: 7.03, koi_depth: 432.6, koi_prad: 2.38, koi_teq: 262, koi_model_snr: 27.8, star_teff: 5518, star_radius: 0.98
        },
        "Kepler-10b": {
            name: "Kepler-10b", koi_fpflag_nt: 0, koi_fpflag_ss: 1, koi_fpflag_co: 0, koi_fpflag_ec: 0, koi_period: 0.84, koi_duration: 1.81, koi_depth: 187.6, koi_prad: 1.47, koi_teq: 2045, koi_model_snr: 65.5, star_teff: 5627, star_radius: 1.06
        },
        "Kepler-16b": {
            name: "Kepler-16b", koi_fpflag_nt: 0, koi_fpflag_ss: 0, koi_fpflag_co: 0, koi_fpflag_ec: 0, koi_period: 228.77, koi_duration: 7.96, koi_depth: 15200.0, koi_prad: 8.45, koi_teq: 201, koi_model_snr: 365.1, star_teff: 4450, star_radius: 0.65
        }
    };

    function updateAllPanels(features, data) {
        updateReportCard(features, data);
        updateChartCard(data);
        updateVisualizationCard(features, data);
    }
    
    // ... (outras funções auxiliares permanecem as mesmas) ...
    function generatePlanetName(features) {
        const periodInt = Math.floor(features.koi_period);
        const radiusInt = Math.floor(features.koi_prad * 100);
        return `KCS-${periodInt}.${radiusInt}`;
    }

    function updateReportCard(features, data) {
        let planetName = 'Custom Planet';
        for (const key in presetExoplanets) {
            if (presetExoplanets[key].koi_period === features.koi_period) {
                planetName = presetExoplanets[key].name;
                break;
            }
        }
        if (planetName === 'Custom Planet' && data.predicted_class === 'CONFIRMED') {
            planetName = generatePlanetName(features);
        }
        reportPlanetName.textContent = planetName;

        const statusMap = { 'CONFIRMED': { text: 'Confirmed Exoplanet', color: 'var(--accent-green)' }, 'CANDIDATE': { text: 'Candidate Exoplanet', color: 'var(--accent-blue)' }, 'FALSE POSITIVE': { text: 'False Positive', color: 'var(--accent-red)' } };
        const statusInfo = statusMap[data.predicted_class] || { text: 'Unknown' };
        const ntStatus = features.koi_fpflag_nt === 0 ? 'PASS' : 'FAIL';
        const cdStatus = features.koi_fpflag_co === 0 ? 'PASS' : 'FAIL';
        const ssStatus = features.koi_fpflag_ss === 0 ? 'PASS' : 'FAIL';
        const ecStatus = features.koi_fpflag_ec === 0 ? 'PASS' : 'FAIL';
        reportContent.innerHTML = `<div class="status-badge-report" style="background-color: ${statusInfo.color};">${statusInfo.text}</div><div class="report-section"><h3>TRANSIT DETECTION FLAGS</h3><div class="transit-flags"><div class="flag-item"><span>Transit (NT)</span><span class="flag-badge ${ntStatus.toLowerCase()}">${ntStatus}</span></div><div class="flag-item"><span>Centroid (CD)</span><span class="flag-badge ${cdStatus.toLowerCase()}">${cdStatus}</span></div><div class="flag-item"><span>Stellar (SS)</span><span class="flag-badge ${ssStatus.toLowerCase()}">${ssStatus}</span></div></div></div><div class="report-section"><h3>TRANSIT PHOTOMETRY</h3><div class="transit-flags"><div class="flag-item"><span>Contamin. (EC)</span><span class="flag-badge ${ecStatus.toLowerCase()}">${ecStatus}</span></div></div></div>`;
    }

    function updateChartCard(data) {
        const probs = data.probabilities;
        const candidateProb = (probs['0'] || 0) * 100;
        const confirmedProb = (probs['1'] || 0) * 100;
        const falsePositiveProb = (probs['2'] || 0) * 100;
        chartContent.innerHTML = `<div class="bar-chart-container"><div class="y-axis-labels"><span>60%</span><span>45%</span><span>30%</span><span>15%</span><span>0%</span></div><div class="bar-wrapper"><div class="prob-value" id="prob-confirmed"></div><div class="chart-bar bar-confirmed" id="bar-confirmed"></div><div class="bar-label">Confirmed</div></div><div class="bar-wrapper"><div class="prob-value" id="prob-candidate"></div><div class="chart-bar bar-candidate" id="bar-candidate"></div><div class="bar-label">Candidate</div></div><div class="bar-wrapper"><div class="prob-value" id="prob-fp"></div><div class="chart-bar bar-fp" id="bar-fp"></div><div class="bar-label">False Positive</div></div></div>`;
        setTimeout(() => {
            document.getElementById('bar-confirmed').style.height = `${confirmedProb * (150/60)}px`;
            document.getElementById('bar-candidate').style.height = `${candidateProb * (150/60)}px`;
            document.getElementById('bar-fp').style.height = `${falsePositiveProb * (150/60)}px`;
            const els = { c: document.getElementById('prob-confirmed'), d: document.getElementById('prob-candidate'), f: document.getElementById('prob-fp') };
            els.c.textContent = `${confirmedProb.toFixed(1)}%`; els.d.textContent = `${candidateProb.toFixed(1)}%`; els.f.textContent = `${falsePositiveProb.toFixed(1)}%`;
            els.c.classList.add('visible'); els.d.classList.add('visible'); els.f.classList.add('visible');
        }, 50);
    }
    
    let scene, camera, renderer, star, orbitCurve, starLight, textureLoader, planetGroup;
    let clock = new THREE.Clock();
    let cameraDistance;

    function getStarColor(temperature) {
        if (temperature > 10000) return 0xaaccff;
        if (temperature > 7500) return 0xffffff;
        if (temperature > 5200) return 0xfff3bf;
        if (temperature > 3700) return 0xffd93d;
        return 0xff6b4a;
    }

    function updateVisualizationCard(features, data) {
        const container = document.getElementById('visualization-container');
        if (!container) return;
        
        const init = !scene;
        if (init) {
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            textureLoader = new THREE.TextureLoader();
            container.appendChild(renderer.domElement);
        }

        renderer.setSize(container.clientWidth, container.clientHeight);

        if (star) scene.remove(star);
        if (starLight) scene.remove(starLight);
        if (planetGroup) scene.remove(planetGroup);
        if (orbitCurve) scene.remove(orbitCurve);

        const { koi_teq = 0, koi_prad = 0, koi_period = 0, star_teff = 5800, star_radius = 1 } = features;

        const starRadius = 5 * star_radius;
        const starColor = getStarColor(star_teff);
        star = new THREE.Mesh(new THREE.SphereGeometry(starRadius, 32, 32), new THREE.MeshBasicMaterial({ color: starColor }));
        scene.add(star);
        starLight = new THREE.PointLight(0xffffff, 2, 500);
        scene.add(starLight);

        planetGroup = new THREE.Group();
        const planetRadius = Math.max(0.5, Math.log10(koi_prad + 1) * 2.5);
        const planetGeometry = new THREE.SphereGeometry(planetRadius, 32, 32);
        let planetMaterial;

        // ======================================================
        // LÓGICA DE APARÊNCIA PARA FALSO POSITIVO
        // ======================================================
        if (data.predicted_class === 'FALSE POSITIVE') {
            // Se for Falso Positivo, cria um material vermelho simples, sem textura.
            planetMaterial = new THREE.MeshStandardMaterial({
                color: 0xef4444, // Cor vermelha do CSS (--accent-red)
                roughness: 0.5,
                emissive: 0xef4444, // Faz brilhar em vermelho
                emissiveIntensity: 0.5
            });
        } else {
            // Lógica normal para CANDIDATE e CONFIRMED
            let planetTexturePath, emissiveColor = 0x000000, emissiveIntensity = 0;
            if (koi_teq > 1000) {
                planetTexturePath = 'textures/lava.jpg'; emissiveColor = 0xff6600; emissiveIntensity = 1.5;
            } else if (koi_teq > 350) {
                planetTexturePath = 'textures/desert.jpg';
            } else if (koi_teq > 200) {
                planetTexturePath = 'textures/earth.jpg';
            } else {
                planetTexturePath = 'textures/ice.jpg'; emissiveColor = 0xccccff; emissiveIntensity = 0.1;
            }
            const planetTexture = textureLoader.load(planetTexturePath);
            planetMaterial = new THREE.MeshStandardMaterial({ map: planetTexture, roughness: 0.9, emissive: new THREE.Color(emissiveColor), emissiveMap: planetTexture, emissiveIntensity: emissiveIntensity });
        }
        
        const planet = new THREE.Mesh(planetGeometry, planetMaterial);
        planetGroup.add(planet);
        scene.add(planetGroup);

        const tempRange = 2000 - 150;
        const normalizedTemp = Math.max(0, Math.min(1, (koi_teq - 150) / tempRange));
        const maxOrbit = starRadius + 30;
        const minOrbit = starRadius + 8;
        const orbitSemiMajor = maxOrbit - (normalizedTemp * (maxOrbit - minOrbit));
        
        const orbitEccentricity = 0.4;
        const orbitSemiMinor = orbitSemiMajor * Math.sqrt(1 - orbitEccentricity ** 2);
        const curve = new THREE.EllipseCurve(-orbitSemiMajor * orbitEccentricity, 0, orbitSemiMajor, orbitSemiMinor, 0, 2 * Math.PI, false, 0);
        
        orbitCurve = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(100)), new THREE.LineBasicMaterial({ color: 0x374151 }));
        orbitCurve.rotation.x = Math.PI / 2;
        scene.add(orbitCurve);
        
        cameraDistance = Math.max(40, orbitSemiMajor * 1.4); 
        camera.position.set(0, cameraDistance / 2, cameraDistance);
        
        const orbitSpeed = 20 / (koi_period || 20);
        const rotationsPerOrbit = 50; 

        function animate() {
            requestAnimationFrame(animate);
            const time = clock.getElapsedTime();
            
            // ======================================================
            // LÓGICA DE MOVIMENTO PARA FALSO POSITIVO
            // ======================================================
            if (data.predicted_class === 'FALSE POSITIVE') {
                // Trajetória de escape: move o objeto para longe da estrela
                const escapeSpeed = time * 5;
                planetGroup.position.set(escapeSpeed, escapeSpeed / 2, -escapeSpeed);
                planetGroup.rotation.y += 0.01;
                planetGroup.rotation.x += 0.01;
            } else {
                // Movimento orbital normal
                const orbitProgress = (time * orbitSpeed) % 1;
                const position = curve.getPointAt(orbitProgress);
                planetGroup.position.set(position.x, 0, position.y);
                const totalRotationAngle = orbitProgress * rotationsPerOrbit * (2 * Math.PI);
                planetGroup.rotation.y = totalRotationAngle;
            }
            
            const cameraAngle = time * 0.05;
            camera.position.x = cameraDistance * Math.sin(cameraAngle);
            camera.position.z = cameraDistance * Math.cos(cameraAngle);
            camera.lookAt(scene.position);
            
            renderer.render(scene, camera);
        }

        if (init) animate();
        
        new ResizeObserver(() => {
            if (!container) return;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }).observe(container);
    }
    
    function getFeaturesFromForm() {
        const formData = new FormData(form);
        const features = {};
        formData.forEach((value, key) => {
            const parsedValue = parseFloat(value);
            features[key] = isNaN(parsedValue) ? 0 : parsedValue;
        });
        return features;
    }

    function populateFormAndSubmit(planetData) {
        for (const key in planetData) {
            const input = document.getElementById(key);
            if (input) {
                input.value = planetData[key];
            }
        }
        form.dispatchEvent(new Event('submit'));
    }

    function createPresetList() {
        presetContainer.innerHTML = '';
        for (const planetKey in presetExoplanets) {
            const planet = presetExoplanets[planetKey];
            const itemDiv = document.createElement('div');
            itemDiv.className = 'preset-item';
            let paramsHTML = '';
            for (const param in planet) {
                if (param !== 'name' && param !== 'type') {
                    paramsHTML += `<div class="param-display">${param}: <span>${planet[param]}</span></div>`;
                }
            }
            itemDiv.innerHTML = `
                <div class="preset-header"><h3>${planet.name}</h3><button class="test-button">Test</button></div>
                <div class="preset-params-grid">${paramsHTML}</div>
            `;
            itemDiv.querySelector('.test-button').addEventListener('click', () => populateFormAndSubmit(planet));
            presetContainer.appendChild(itemDiv);
        }
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        predictButton.textContent = 'Analyzing...';
        predictButton.disabled = true;
        const allFeatures = getFeaturesFromForm();
        const apiPayload = {};
        for (const key in allFeatures) {
            if (key.startsWith('koi_')) {
                apiPayload[key] = allFeatures[key];
            }
        }

        try {
            const response = await fetch('http://127.0.0.1:8000/predict', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(apiPayload)
            });
            if (!response.ok) throw new Error(`Server Error: ${response.statusText}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            updateAllPanels(allFeatures, data);
        } catch (error) {
            console.error('Fetch Error:', error);
            chartContent.innerHTML = `<p style="color: var(--accent-red);">${error.message}</p>`;
        } finally {
            predictButton.textContent = 'Classify Exoplanet';
            predictButton.disabled = false;
        }
    });

    function initialize() {
        createPresetList();
        const firstPlanetKey = Object.keys(presetExoplanets)[0];
        populateFormAndSubmit(presetExoplanets[firstPlanetKey]);
    }

    initialize();
});
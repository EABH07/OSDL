// 1. CONFIGURACIÓN: El "mapeador" de IDs para no escribirlos en list.js
const USER_ID_MAP = {
    "EABH": "1165077788781461524",
    "Nani": "997611811140542566",
	"Pirilupipis": "897605808366444554"
};
// Si 'list' ya existe (porque se cargó list.js), la dejamos como está. 
// Si no existe, la creamos vacía.
if (typeof window.list === 'undefined') {
    window.list = []; 
}

async function loadLevels() {
    try {
        const responseIndex = await fetch('./levels/index.json');
        const levelNames = await responseIndex.json();

        // Creamos una lista temporal para no ir dibujando uno por uno
        let tempList = [];

        for (let i = 0; i < levelNames.length; i++) {
            const name = levelNames[i];
            try {
                const res = await fetch(`./levels/${name}.json`);
                if (!res.ok) continue;
                const data = await res.json();
                
                // Asignamos el puesto basado en el orden del index.json
                data.auto_rank = i + 1; 
                tempList.push(data);
            } catch (err) {
                console.error("Error en el archivo " + name, err);
            }
        }

        // Una vez que todos los archivos se procesaron, actualizamos la lista global
        window.list = tempList;

        // Ahora sí, llamamos a dibujar
        if (typeof renderMainList === 'function') {
            renderMainList();
        }

    } catch (error) {
        console.error("Error cargando niveles:", error);
    }
}

// Ejecutar la carga al iniciar
loadLevels();

// Llamar a la carga cuando la página esté lista
document.addEventListener('DOMContentLoaded', () => {
    loadLevels();
});

document.addEventListener('DOMContentLoaded', () => {
    console.log("Sistema de Auth iniciado.");

    // Capturar token de la URL
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = fragment.get('access_token');

    if (accessToken) {
        localStorage.setItem('discord_token', accessToken);
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    const savedToken = localStorage.getItem('discord_token');
    if (savedToken) {
        fetchUserData(savedToken);
    }
});

function fetchUserData(token) {
    fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(user => {
        if (user.id) {
            console.log("Login exitoso:", user.username);
            localStorage.setItem('discord_user_id', user.id);
            
            document.getElementById('login-discord').style.display = 'none';
            document.getElementById('user-profile').style.display = 'flex';
            document.getElementById('user-name').innerText = user.username;
            
            const avatarURL = user.avatar 
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
                : 'https://discord.com/assets/embed/avatars/0.png';
            
            document.getElementById('user-avatar').src = avatarURL;
        } else {
            localStorage.removeItem('discord_token');
        }
    })
    .catch(err => {
        console.error("Error en login:", err);
        localStorage.removeItem('discord_token');
    });
}

function showProfile() {
    const modal = document.getElementById('MODAL-PERFIL');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        renderUserProfile();
    }
}

function renderUserProfile() {
    const listContainer = document.getElementById('user-completed-list');
    const statsContainer = document.getElementById('profile-stats');
    const currentID = localStorage.getItem('discord_user_id');
    const currentName = document.getElementById('user-name')?.innerText || "";

    if (!listContainer) return;
    listContainer.innerHTML = ''; 
    let count = 0;

    if (typeof list !== 'undefined') {
        // AUTOMATIZACIÓN: Inyectar IDs desde el MAP antes de buscar
        list.forEach(level => {
            level.vids?.forEach(record => {
                if (USER_ID_MAP[record.user]) {
                    record.discordID = USER_ID_MAP[record.user];
                }
            });
        });

        list.forEach((level, index) => {
            let isMyLevel = false;
            let videoLink = "";
            let percentage = 100;

            // Revisar Verificador
            if ((level.author && level.author.toLowerCase() === currentName.toLowerCase()) || level.verifierDiscordID === currentID) {
                isMyLevel = true;
                videoLink = level.verificationVid;
            }

            // Revisar Récords
            level.vids?.forEach(record => {
                const recordID = record.discordID ? String(record.discordID).trim() : null;
                if ((currentID && recordID === currentID) || (record.user.toLowerCase() === currentName.toLowerCase() && currentName !== "")) {
                    isMyLevel = true;
                    videoLink = record.link;
                    percentage = record.percent;
                }
            });

            if (isMyLevel) {
                count++;
                const card = document.createElement('div');
                card.style.cssText = "background: #2f3136; padding: 12px; margin: 8px 0; border-radius: 8px; border-left: 4px solid #5865f2; display: flex; justify-content: space-between; align-items: center; color: white;";
                
                const tag = (level.author?.toLowerCase() === currentName.toLowerCase()) ? '[VERIFICADOR]' : '[RECORD]';

                card.innerHTML = `
                    <div><div style="font-weight: bold; font-size: 14px;">#${index + 1} - ${level.name} <small>${tag}</small></div></div>
                    <div style="text-align: right;"><div style="color: #5865f2; font-weight: bold;">${percentage}%</div>
                    <a href="${videoLink}" target="_blank" style="color: #00b0f4; font-size: 11px; text-decoration: none;">Video ↗</a></div>
                `;
                listContainer.appendChild(card);
            }
        });
    }
    if (statsContainer) statsContainer.innerText = `Total niveles: ${count}`;
}

function closeProfile() {
    const modal = document.getElementById('MODAL-PERFIL');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function logout() {
    console.log("Cerrando sesión...");
    localStorage.clear();
    // Reemplaza por tu link de GitHub
    window.location.href = 'https://eabh07.github.io/OSDL/';
}

function updateLeaderboard() {
    const tableBody = document.getElementById('leaderboard-body');
    if (!tableBody) return;

    let players = {};
    const TOP_LIMIT = 40; 

    list.forEach((level, index) => {
        let givesPoints = (index < TOP_LIMIT);
        let pointsPerLevel = givesPoints ? Math.max(20, 100 - (index * 2)) : 0;

        const reg = (name) => {
            if (!name) return;
            name = name.trim();
            if (!players[name]) players[name] = { name: name, count: 0, points: 0, legacyCount: 0 };
            if (givesPoints) { players[name].count++; players[name].points += pointsPerLevel; }
            else { players[name].legacyCount++; }
        };

        if (level.author) reg(level.author);
        level.vids?.forEach(r => { if (r.percent === 100) reg(r.user); });
    });

    let sorted = Object.values(players).sort((a, b) => b.points !== a.points ? b.points - a.points : (b.count+b.legacyCount)-(a.count+a.legacyCount));

    tableBody.innerHTML = sorted.map((p, i) => {
        let medal = (i === 0) ? "🥇" : (i === 1) ? "🥈" : (i === 2) ? "🥉" : `#${i + 1}`;
        return `<tr onclick="viewOtherProfile('${p.name}')" style="border-bottom: 1px solid #333; cursor: pointer; opacity: ${p.points > 0 ? '1' : '0.7'};">
            <td style="padding: 12px; text-align: center; color: #f1c40f;">${medal}</td>
            <td style="padding: 12px; font-weight: bold;">${p.name}</td>
            <td style="padding: 12px; text-align: center;">${p.count + p.legacyCount}</td>
            <td style="padding: 12px; text-align: center; color: #00b0f4;">${p.points.toFixed(0)}</td>
        </tr>`;
    }).join('');
}

function viewOtherProfile(playerName) {
    const modal = document.getElementById('MODAL-PERFIL');
    if (!modal) return;
    document.getElementById('profile-big-name').innerText = playerName;
    document.getElementById('profile-big-avatar').src = "img/logo.png";
    const listContainer = document.getElementById('user-completed-list');
    listContainer.innerHTML = '';
    let count = 0;

    list.forEach((level, index) => {
        let isHis = (level.author?.toLowerCase() === playerName.toLowerCase());
        let vLink = level.verificationVid;

        level.vids?.forEach(r => {
            if (r.user.toLowerCase() === playerName.toLowerCase()) { isHis = true; vLink = r.link; }
        });

        if (isHis) {
            count++;
            const card = document.createElement('div');
            card.style.cssText = "background: #2f3136; padding: 10px; margin: 5px 0; border-radius: 5px; border-left: 3px solid #5865f2; display: flex; justify-content: space-between; font-size: 13px; color: white;";
            card.innerHTML = `<span>#${index + 1} ${level.name}</span> <a href="${vLink}" target="_blank" style="color: #5865f2; text-decoration: none;">Link ↗</a>`;
            listContainer.appendChild(card);
        }
    });
    document.getElementById('profile-stats').innerText = `Niveles totales: ${count}`;
    modal.style.display = 'flex';
}

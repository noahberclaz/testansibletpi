document.addEventListener("DOMContentLoaded", function () {
    const roomList = document.getElementById("room-list");
    const main = document.querySelector("main");
    const searchInput = document.getElementById("search-input");
    const searchBtn = document.getElementById("search-btn");
    const qualityFilter = document.getElementById("quality-filter");

    if (!roomList || !main || !searchInput || !searchBtn || !qualityFilter) {
        console.error("Un ou plusieurs éléments DOM n'ont pas été trouvés :", {
            roomList, main, searchInput, searchBtn, qualityFilter
        });
        return;
    }

    // Ajouter un élément de notification d'erreur (du premier script)
    const errorNotification = document.createElement("div");
    errorNotification.id = "error-notification";
    errorNotification.classList.add("error-notification");
    errorNotification.style.display = "none";
    errorNotification.textContent = "Une erreur est survenue !";
    document.body.appendChild(errorNotification);

    // Fonction pour afficher la notification d'erreur (du premier script)
    function showErrorNotification() {
        errorNotification.style.display = "block";
        setTimeout(function () {
            errorNotification.style.display = "none";
        }, 3000);
    }

    // Fonction pour créer la section des détails de la salle (version du second script avec Chart.js)
    function createRoomDetailsSection(room) {
        const roomDetails = document.createElement("div");
        roomDetails.id = "room-details";
        roomDetails.classList.add("hidden");

        const qualityData = getQualityClass(room.quality);

        roomDetails.innerHTML = `
            <button id="back-btn">⬅ Retour</button>
            <h2 id="room-name">${room.name}</h2>
            <div class="graphique-details">
                <canvas id="room-graph" class="graphique_stat" alt="Graphique qualité de l'air"></canvas>
            </div>
            <div class="status">
                <button class="download" data-id="${room.id}" data-name="${room.name}">⬇ Télécharger</button>
                <div class="state">
                    <div class="indicator">
                        <span id="room-quality">${room.quality}</span>
                    </div>
                    <img id="room-emoji" src="${qualityData.image}" class="${qualityData.class}">
                </div>
            </div>
            <section class="details" id="room-info"></section>
        `;

        main.appendChild(roomDetails);

        // Ajouter l'événement de téléchargement pour ce bouton (version CSV du second script)
        document.querySelectorAll(".download").forEach(button => {
            button.addEventListener("click", function () {
                const roomName = this.getAttribute("data-name");
                const roomInfo = document.getElementById("room-info");
                const details = roomInfo.querySelectorAll(".info");

                let csvContent = `Nom de la salle: ${roomName}\n\nTitle,Value\n`;
                details.forEach(detail => {
                    const title = detail.querySelector("h4")?.textContent || "";
                    const value = detail.querySelector("p")?.textContent || "";
                    csvContent += `"${title}","${value}"\n`;
                });

                const link = document.createElement("a");
                const encodedCsvContent = new TextEncoder().encode(csvContent);
                const blob = new Blob([encodedCsvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const encodedRoomName = encodeURIComponent(roomName).replace(/%20/g, " ");
                link.setAttribute("href", url);
                link.setAttribute("download", `${encodedRoomName}.csv`);
                link.click();
            });
        });

        // Gestion du bouton Retour
        const backBtn = document.getElementById("back-btn");
        if (backBtn) {
            backBtn.addEventListener("click", function () {
                roomDetails.classList.add("hidden");
                roomList.classList.remove("hidden");
                main.removeChild(roomDetails);
            });
        }

        return roomDetails;
    }

    // Fonction pour déterminer la classe de qualité (version du second script avec seuils 80/50)
    function getQualityClass(quality) {
        quality = parseFloat(quality);
        let image = '';
        let className = '';

        if (isNaN(quality) || quality === "N/A") {
            image = './assets/black-sad-face.png';
            className = 'quality-low';
        } else if (quality >= 80) {
            image = './assets/black-smiling-face.png';
            className = 'quality-high';
        } else if (quality >= 50) {
            image = './assets/black-neutral-face.png';
            className = 'quality-medium';
        } else {
            image = './assets/black-sad-face.png';
            className = 'quality-low';
        }

        return { image, class: className };
    }

    

    // Fonction pour afficher les salles (version du second script avec Chart.js)
    async function displayRooms() {
        roomList.innerHTML = "<h1>Captor View</h1>";
        try {
            const rooms = await getRooms();
            let filteredRooms = rooms;

            // Filtrage par recherche
            const searchTerm = searchInput.value.trim().toLowerCase();
            if (searchTerm) {
                filteredRooms = rooms.filter(room => {
                    // Extraire l'identifiant de la salle (ex: "E304" de "Salle E304")
                    const roomIdentifier = room.name.toLowerCase().replace("salle ", "");
                    return roomIdentifier.startsWith(searchTerm);
                });
            }

            // Filtrage par qualité
            const qualityFilterValue = qualityFilter.value;
            if (qualityFilterValue !== "all") {
                filteredRooms = filteredRooms.filter(room => {
                    const quality = parseFloat(room.quality);
                    if (isNaN(quality) || room.quality === "N/A") {
                        return qualityFilterValue === "bad";
                    }
                    if (qualityFilterValue === "good") return quality >= 80;
                    if (qualityFilterValue === "medium") return quality >= 50 && quality < 80;
                    if (qualityFilterValue === "bad") return quality < 50;
                    return true;
                });
            }

            // Afficher les salles filtrées
            if (filteredRooms.length === 0) {
                const noRoomsMessage = document.createElement("p");
                noRoomsMessage.classList.add("no-rooms-message");
                noRoomsMessage.textContent = "Aucune salle trouvée.";
                roomList.appendChild(noRoomsMessage);
            } else {
                filteredRooms.forEach(room => {
                    const roomDiv = document.createElement("div");
                    roomDiv.classList.add("room");

                    const qualityData = getQualityClass(room.quality);

                    roomDiv.innerHTML = `
                        <h2><a href="#" data-id="${room.id}">${room.name}</a></h2>
                        <div class="graphique-display">
                            <canvas id="graph-${room.id}"></canvas>
                        </div>
                        <div class="status">
                            <button class="download" data-id="${room.id}" data-name="${room.name}">⬇ Télécharger</button>
                            <div class="state">
                                <div class="indicator">
                                    <span>${room.quality}</span>
                                </div>
                                <img src="${qualityData.image}" class="${qualityData.class}">
                            </div>
                        </div>
                    `;
                    roomList.appendChild(roomDiv);

                    setTimeout(() => createRoomChart(`graph-${room.id}`, room), 100);
                });
            }

            document.querySelectorAll("#room-list a").forEach(link => {
                link.addEventListener("click", function (e) {
                    e.preventDefault();
                    const roomId = parseInt(this.getAttribute("data-id"));
                    displayRoomDetails(roomId);
                });
            });

            document.querySelectorAll(".download").forEach(button => {
                button.addEventListener("click", function () {
                    const roomName = this.getAttribute("data-name");
                    const roomInfo = document.getElementById("room-info");
                    const details = roomInfo?.querySelectorAll(".info") || [];

                    let csvContent = `Nom de la salle: ${roomName}\n\nTitle,Value\n`;
                    details.forEach(detail => {
                        const title = detail.querySelector("h4")?.textContent || "";
                        const value = detail.querySelector("p")?.textContent || "";
                        csvContent += `"${title}","${value}"\n`;
                    });

                    const link = document.createElement("a");
                    const encodedCsvContent = new TextEncoder().encode(csvContent);
                    const blob = new Blob([encodedCsvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const encodedRoomName = encodeURIComponent(roomName).replace(/%20/g, " ");
                    link.setAttribute("href", url);
                    link.setAttribute("download", `${encodedRoomName}.csv`);
                    link.click();
                });
            });
        } catch (error) {
            console.error("Erreur lors de l'affichage des salles :", error);
            showErrorNotification();
        }
    }

    // Fonction pour afficher les détails d'une salle (version du second script avec Chart.js)
    async function displayRoomDetails(roomId) {
        try {
            const rooms = await getRooms();
            const room = rooms.find(r => r.id === roomId);
            if (!room) return;

            const qualityData = getQualityClass(room.quality);
            const roomDetails = createRoomDetailsSection(room);

            document.getElementById("room-name").textContent = room.name;
            document.getElementById("room-quality").textContent = room.quality;
            document.getElementById("room-emoji").src = qualityData.image;
            document.getElementById("room-emoji").className = qualityData.class;

            const roomInfo = document.getElementById("room-info");
            roomInfo.innerHTML = "";
            room.details.forEach(detail => {
                const detailDiv = document.createElement("div");
                detailDiv.classList.add("info");
                detailDiv.innerHTML = `
                    <img src="${detail.icon}" alt="${detail.title}">
                    <h4>${detail.title}</h4>
                    <p>${detail.value}</p>
                `;
                roomInfo.appendChild(detailDiv);
            });

            setTimeout(() => {
                if (roomChart) {
                    roomChart.destroy();
                }
                roomChart = createRoomChart("room-graph", room);
            }, 100);

            roomList.classList.add("hidden");
            roomDetails.classList.remove("hidden");
        } catch (error) {
            console.error("Erreur lors de l'affichage des détails de la salle :", error);
            showErrorNotification();
        }
    }

    // Gestion du clic sur le bouton "Disconnect" (du premier script)
    const disconnectButton = document.querySelector('.disconnect label');
    disconnectButton.addEventListener("click", showErrorNotification);

    searchBtn.addEventListener("click", function () {
        displayRooms();
    });

    searchInput.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
            displayRooms();
        }
    });

    qualityFilter.addEventListener("change", function () {
        displayRooms();
    });


    // Fonction pour générer des données aléatoires (du second script)
    let roomChart = null;
    function generateRandomData(roomId) {
        const storedData = localStorage.getItem(`roomData_${roomId}`);
        if (storedData) {
            return JSON.parse(storedData);
        } else {
            const data = Array.from({ length: 12 }, () => Math.floor(Math.random() * 100));
            localStorage.setItem(`roomData_${roomId}`, JSON.stringify(data));
            return data;
        }
    }

    // Créer un graphique avec Chart.js
    function createRoomChart(canvasId, room) {
        const ctx = document.getElementById(canvasId)?.getContext("2d");
        if (!ctx) return console.error(`Canvas introuvable: ${canvasId}`);
    
        const labels = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
        const now = new Date();
        const currentHour = now.getHours();
        const currentLabel = currentHour.toString().padStart(2, "0") + ":00";
        const currentIndex = labels.indexOf(currentLabel);
    
        // Si la donnée qualité est invalide ou manquante, on ne génère rien
        const qualityValid = (
            currentHour >= 7 &&
            currentHour <= 18 &&
            currentIndex !== -1 &&
            room.quality !== undefined &&
            !isNaN(parseFloat(room.quality))
        );
    
        if (!qualityValid) {
            console.warn(`Pas de valeur de qualité disponible pour la salle ${room.id}`);
            if (ctx.canvas) {
                ctx.canvas.parentNode.innerHTML = "<p style='text-align:center;color:black;'>Aucune donnée disponible</p>";
            }
            return;
        }
    
        // Génère ou récupère les données existantes
        const data = generateRandomData(room.id);
        data[currentIndex] = parseFloat(room.quality); // remplace la valeur actuelle

        for (let i = currentIndex + 1; i < data.length; i++) {
            data[i] = null;
        }
    
    
        if (roomChart) {
            roomChart.destroy();
        }
    
        return new Chart(ctx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [{
                    label: "Qualité de l'air (%)",
                    data: data,
                    borderColor: "#36A2EB",
                    backgroundColor: "rgba(54, 162, 235, 0.2)",
                    fill: true,
                    tension: 0.35
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: "black",
                            font: { size: 14 }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: "Heure", color: "black" },
                        grid: { color: context => context.index === 0 ? "black" : "rgba(0, 0, 0, 0.1)", lineWidth: 1 },
                        ticks: { color: "black", font: { size: 12 } },
                        borderColor: "black",
                        borderWidth: 2
                    },
                    y: {
                        min: 0,
                        max: 100,
                        title: { display: true, text: "Qualité (%)", color: "black" },
                        grid: { color: context => context.index === 0 ? "black" : "rgba(0, 0, 0, 0.1)", lineWidth: 1 },
                        ticks: { color: "black", font: { size: 12 } },
                        borderColor: "black",
                        borderWidth: 2
                    }
                },
                animation: {
                    duration: 800,
                    easing: "easeOutQuart"
                }
            }
        });
    }

    // Charger Chart.js et afficher les salles (du second script)
    if (typeof Chart === "undefined") {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/chart.js";
        script.onload = function () {
            console.log("Chart.js chargé !");
            displayRooms();
        };
        document.head.appendChild(script);
    } else {
        displayRooms();
    }
});
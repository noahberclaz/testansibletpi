document.addEventListener("DOMContentLoaded", function () {
    const roomList = document.getElementById("room-list");
    const main = document.querySelector("main");
    const addRoomModal = document.getElementById("add-room-modal");
    const saveRoomBtn = document.getElementById("save-room-btn");
    const addRoomBtn = document.getElementById("add-room-btn");
    const roomCaptorSelect = document.getElementById("room-captor");
    const searchInput = document.getElementById("search-input");
    const searchBtn = document.getElementById("search-btn");
    const qualityFilter = document.getElementById("quality-filter");

    // Vérifier que les éléments DOM existent
    if (!roomList || !main || !addRoomModal || !saveRoomBtn || !addRoomBtn || !roomCaptorSelect || !searchInput || !searchBtn || !qualityFilter) {
        console.error("Un ou plusieurs éléments DOM n'ont pas été trouvés :", {
            roomList, main, addRoomModal, saveRoomBtn, addRoomBtn, roomCaptorSelect, searchInput, searchBtn, qualityFilter
        });
        return;
    }


    // Ajouter un élément de notification d'erreur
    const errorNotification = document.createElement("div");
    errorNotification.id = "error-notification";
    errorNotification.classList.add("error-notification");
    errorNotification.style.display = "none";
    errorNotification.textContent = "Une erreur est survenue !";
    document.body.appendChild(errorNotification);

    // Fonction pour afficher la notification d'erreur
    function showErrorNotification() {
        errorNotification.style.display = "block";
        setTimeout(function () {
            errorNotification.style.display = "none";
        }, 3000);
    }

    // Fonction pour récupérer les capteurs disponibles (non assignés)
    async function fetchAvailableCaptors() {
        try {
            console.log("Récupération des capteurs depuis l'API...");
            const response = await fetch("http://localhost:3000/api/captors");
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            const captors = await response.json();
            console.log("Capteurs récupérés :", captors);
            const availableCaptors = captors.filter(captor => captor.salle_id === null || captor.salle_id === undefined);
            console.log("Capteurs non assignés :", availableCaptors);
            return availableCaptors;
        } catch (error) {
            console.error("Erreur lors de la récupération des capteurs :", error);
            showErrorNotification();
            return [];
        }
    }

    // Fonction pour remplir la liste déroulante des capteurs disponibles
    async function populateCaptorSelect() {
        console.log("Remplissage de la liste déroulante des capteurs...");
        const captors = await fetchAvailableCaptors();
        roomCaptorSelect.innerHTML = '<option value="none">Aucun capteur</option>';
        console.log("Ajout des capteurs à la liste déroulante :", captors);
        captors.forEach(captor => {
            const option = document.createElement("option");
            option.value = captor.id;
            option.textContent = `Capteur ID: ${captor.id} (Batterie: ${captor.battery}%)`;
            roomCaptorSelect.appendChild(option);
        });
        console.log("Liste déroulante remplie.");
    }

    // Fonction pour créer la section des détails de la salle avec des données dynamiques
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

        // Ajouter l'événement de téléchargement pour ce bouton
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

    function getQualityClass(quality) {
        if (!quality || quality === "N/A") return { class: "quality-low", image: "./assets/black-sad-face.png" };
        quality = parseFloat(quality);
        if (quality >= 80) return { class: "quality-high", image: "./assets/black-smiling-face.png" };
        if (quality >= 50) return { class: "quality-medium", image: "./assets/black-neutral-face.png" };
        return { class: "quality-low", image: "./assets/black-sad-face.png" };
    }

    // Gestion des menus d'options
    document.body.addEventListener("click", function (event) {
        const optionsBtn = event.target.closest(".options-btn");
        if (optionsBtn) {
            const roomId = optionsBtn.dataset.id;
            const menu = document.getElementById(`options-menu-${roomId}`);
            if (menu) {
                document.querySelectorAll(".options-menu").forEach(otherMenu => {
                    if (otherMenu !== menu) otherMenu.classList.add("hidden");
                });
                menu.classList.toggle("hidden");
                event.stopPropagation();
            }
        }

        const isClickInsideMenu = event.target.closest(".options-menu");
        if (!optionsBtn && !isClickInsideMenu) {
            document.querySelectorAll(".options-menu").forEach(menu => {
                menu.classList.add("hidden");
            });
        }
    });
    // Afficher les salles
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
                        <div class="room" id="room-${room.id}">
                            <button class="options-btn" data-id="${room.id}">
                                <img src="./assets/logo-3points.png" alt="Options" class="options_button_admin">
                            </button>
                            <div class="options-menu hidden" id="options-menu-${room.id}">
                                <button class="edit-room" data-id="${room.id}">Modifier</button>
                                <button class="delete-room" data-id="${room.id}">Supprimer</button>
                            </div>
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

            document.querySelectorAll(".edit-room").forEach(button => {
                button.addEventListener("click", function () {
                    const roomId = this.getAttribute("data-id");
                    openEditModal(roomId);
                });
            });

            document.querySelectorAll(".delete-room").forEach(button => {
                button.addEventListener("click", function () {
                    const roomId = this.getAttribute("data-id");
                    deleteRoom(roomId);
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


    // Afficher les détails d'une salle
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

    // Variable pour suivre le mode (ajout ou modification)
    let isEditing = false;
    let editingRoomId = null;

    // Fonction pour ajouter une salle
    async function addRoom() {
        const roomIdInput = document.getElementById("room-id").value.trim();
        const captorId = document.getElementById("room-captor").value;

        if (!roomIdInput) {
            alert("Veuillez entrer un nom pour la salle (ex: F119)");
            return;
        }
        const nom = `Salle ${roomIdInput}`;

        try {
            const rooms = await getRooms();
            const existingRoom = rooms.find(room => room.name === nom);
            if (existingRoom) {
                alert(`Une salle avec le nom "${nom}" existe déjà. Veuillez choisir un autre nom.`);
                return;
            }

            const response = await fetch('http://localhost:3000/api/salles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nom })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de l’ajout de la salle');
            }

            const newRoom = await response.json();

            if (captorId !== "none") {
                const updateResponse = await fetch(`http://localhost:3000/api/captors/${captorId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ salle_id: roomIdInput })
                });
                if (!updateResponse.ok) {
                    const errorData = await updateResponse.json();
                    throw new Error(errorData.error || 'Erreur lors de l\'assignation du capteur');
                }
            }

            addRoomModal.classList.add("hidden");
            await displayRooms();
        } catch (error) {
            console.error('Erreur lors de l’ajout de la salle ou de l\'assignation du capteur:', error.message);
            alert(error.message);
            showErrorNotification();
        }
    }

    // Fonction pour modifier une salle
    async function updateRoom(roomId) {
        const roomIdInput = document.getElementById("room-id").value.trim();
        const captorId = document.getElementById("room-captor").value;

        if (!roomIdInput) {
            alert("Veuillez entrer un nom pour la salle (ex: F119)");
            return;
        }
        const nom = `Salle ${roomIdInput}`;

        try {
            const rooms = await getRooms();
            const existingRoom = rooms.find(room => room.name === nom && room.id !== parseInt(roomId));
            if (existingRoom) {
                alert(`Une autre salle avec le nom "${nom}" existe déjà. Veuillez choisir un autre nom.`);
                return;
            }

            const response = await fetch(`http://localhost:3000/api/salles/${roomId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nom })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de la modification de la salle');
            }

            if (captorId !== "none") {
                const updateResponse = await fetch(`http://localhost:3000/api/captors/${captorId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ salle_id: roomIdInput })
                });
                if (!updateResponse.ok) {
                    const errorData = await updateResponse.json();
                    throw new Error(errorData.error || 'Erreur lors de l\'assignation du capteur');
                }
            } else {
                const captorsResponse = await fetch('http://localhost:3000/api/captors');
                if (!captorsResponse.ok) {
                    throw new Error('Erreur lors de la récupération des capteurs');
                }
                const captors = await captorsResponse.json();
                const captorToUnassign = captors.find(captor => captor.salle_id === roomIdInput);

                if (captorToUnassign) {
                    const unassignResponse = await fetch(`http://localhost:3000/api/captors/${captorToUnassign.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ salle_id: null })
                    });
                    if (!unassignResponse.ok) {
                        const errorData = await unassignResponse.json();
                        throw new Error(errorData.error || 'Erreur lors de la désassignation du capteur');
                    }
                }
            }

            addRoomModal.classList.add("hidden");
            isEditing = false;
            editingRoomId = null;
            saveRoomBtn.textContent = "Ajouter";
            await displayRooms();

            if (window.opener && window.opener.populateRoomSelects) {
                window.opener.populateRoomSelects();
            }
        } catch (error) {
            console.error('Erreur lors de la modification de la salle:', error.message);
            alert(error.message);
            showErrorNotification();
        }
    }

    // Fonction pour supprimer une salle
    async function deleteRoom(roomId) {
        const confirmation = confirm("Êtes-vous sûr de vouloir supprimer cette salle ?");
        if (!confirmation) {
            console.log("Suppression annulée par l'utilisateur.");
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/api/salles/${roomId}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de la suppression de la salle');
            }

            const successNotification = document.createElement("div");
            successNotification.classList.add("success-notification");
            successNotification.textContent = "La salle a bien été supprimée !";
            document.body.appendChild(successNotification);
            successNotification.style.display = "block";
            setTimeout(() => {
                successNotification.style.display = "none";
                document.body.removeChild(successNotification);
            }, 3000);

            await displayRooms();

            if (window.opener && window.opener.populateRoomSelects) {
                window.opener.populateRoomSelects();
            }
        } catch (error) {
            console.error('Erreur lors de la suppression de la salle:', error.message);
            showErrorNotification();
        }
    }

    // Gestion de l'ouverture de la modale de modification
    async function openEditModal(roomId) {
        try {
            const rooms = await getRooms();
            const room = rooms.find(r => r.id == roomId);
            if (!room) return;

            document.getElementById("room-id").value = room.name.replace('Salle ', '');
            saveRoomBtn.textContent = "Mettre à jour";
            isEditing = true;
            editingRoomId = roomId;

            await populateCaptorSelect();

            const captorsResponse = await fetch('http://localhost:3000/api/captors');
            if (!captorsResponse.ok) {
                throw new Error('Erreur lors de la récupération des capteurs');
            }
            const captors = await captorsResponse.json();
            const roomIdentifier = room.name.split(" ")[1];
            const assignedCaptor = captors.find(captor => captor.salle_id === roomIdentifier);

            if (assignedCaptor) {
                document.getElementById("room-captor").value = assignedCaptor.id;
            } else {
                document.getElementById("room-captor").value = "none";
            }

            addRoomModal.classList.remove("hidden");
        } catch (error) {
            console.error("Erreur lors de l'ouverture de la modale de modification :", error);
            showErrorNotification();
        }
    }

    // Gestion des événements
    saveRoomBtn.addEventListener("click", async function () {
        if (isEditing) {
            await updateRoom(editingRoomId);
        } else {
            await addRoom();
        }
    });

    addRoomBtn.addEventListener("click", function () {
        document.getElementById("room-id").value = "";
        saveRoomBtn.textContent = "Ajouter";
        isEditing = false;
        editingRoomId = null;
        populateCaptorSelect();
        addRoomModal.classList.remove("hidden");
    });

    document.querySelectorAll(".close-modal").forEach(button => {
        button.addEventListener("click", function () {
            addRoomModal.classList.add("hidden");
            saveRoomBtn.textContent = "Ajouter";
            isEditing = false;
            editingRoomId = null;
        });
    });

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

    // Charger Chart.js et afficher les salles
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

     // Générer des données aléatoires pour les graphiques
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
    let roomChart = null;
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
});
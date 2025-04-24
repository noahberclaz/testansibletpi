document.addEventListener("DOMContentLoaded", function () {
    const captorList = document.getElementById("captor-list");
    const backToAdminBtn = document.getElementById("back-to-admin-btn");

    // Vérifier que les éléments DOM existent
    if (!captorList || !backToAdminBtn) {
        console.error("Un ou plusieurs éléments DOM n'ont pas été trouvés :", {
            captorList, backToAdminBtn
        });
        return;
    }

    // Fonction pour récupérer les salles depuis l'API
    async function fetchRooms() {
        try {
            const response = await fetch("http://localhost:3000/api/salles");
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            const rooms = await response.json();
            return rooms;
        } catch (error) {
            console.error("Erreur lors de la récupération des salles :", error);
            return [];
        }
    }

    // Fonction pour récupérer les capteurs depuis l'API
    async function fetchCaptors() {
        try {
            const response = await fetch("http://localhost:3000/api/captors");
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            const captors = await response.json();
            console.log("📋 Données reçues :", captors);
            displayCaptors(captors);
            return captors;
        } catch (error) {
            console.error("Erreur lors de la récupération des capteurs :", error);
            return [];
        }
    }

    // Fonction pour remplir les listes déroulantes avec les salles
async function populateRoomSelects() {
    console.log('Mise à jour des listes déroulantes des salles...');
    const rooms = await fetchRooms();
    const captors = await fetchCaptors(); // Récupérer les capteurs pour savoir quelles salles sont assignées

    const addSelect = document.getElementById("captor-room");
    const editSelect = document.getElementById("edit-captor-room");

    // Vérifier que les éléments existent
    if (!addSelect || !editSelect) {
        console.error("Les éléments de sélection des salles n'ont pas été trouvés :", {
            addSelect, editSelect
        });
        return;
    }

    // Vider les listes déroulantes
    addSelect.innerHTML = '<option value="Non assigné">Non assigné</option>';
    editSelect.innerHTML = '<option value="Non assigné">Non assigné</option>';

    // Créer une liste des salles déjà assignées
    const assignedRooms = captors
        .filter(captor => captor.salle_id) // Ne garder que les capteurs assignés
        .map(captor => captor.salle_id); // Récupérer les salle_id (ex: "F119")

    // Ajouter les salles aux listes déroulantes
    rooms.forEach(room => {
        const roomIdentifier = room.nom.split(" ")[1]; // Ex: "Salle F119" -> "F119"

        // Pour la liste d'ajout
        const option1 = document.createElement("option");
        option1.value = room.nom; // Ex: "Salle F119"
        option1.textContent = room.nom;
        if (assignedRooms.includes(roomIdentifier)) {
            option1.disabled = true; // Désactiver l'option si la salle est déjà assignée
            option1.style.color = "gray"; // Griser l'option
        }
        addSelect.appendChild(option1);

        // Pour la liste de modification
        const option2 = document.createElement("option");
        option2.value = room.nom; // Ex: "Salle F119"
        option2.textContent = room.nom;
        if (assignedRooms.includes(roomIdentifier)) {
            option2.disabled = true; // Désactiver l'option si la salle est déjà assignée
            option2.style.color = "gray"; // Griser l'option
        }
        editSelect.appendChild(option2);
    });
}

    // Fonction pour afficher les capteurs
    function displayCaptors(captors) {
        captorList.innerHTML = "<h1>Liste des Capteurs</h1>";
        captors.forEach(captor => {
            const captorDiv = document.createElement("div");
            captorDiv.classList.add("captor");
            captorDiv.innerHTML = `
                ${captor.statut === 'defect' ? '<span class="warning">⚠️ Capteur défectueux</span>' : ''}
                <h2>Capteur ID: ${captor.id}</h2>
                <p><strong>Assigné à:</strong> ${captor.salle_id ? "Salle " + captor.salle_id : "Non assigné"}</p>
                <p><strong>Batterie:</strong> ${captor.battery}%</p>
                <div class="status-container">
                    <strong>Statut:</strong>
                    <span class="status ${captor.statut.toLowerCase()}">${captor.statut}</span>
                </div>
                <button class="edit-captor" data-id="${captor.id}">✏️ Modifier</button>
                <button class="delete-captor" data-id="${captor.id}">❌ Supprimer</button>
            `;
            captorList.appendChild(captorDiv);
        });

        attachEventListeners();
    }

    // Fonction pour ajouter un capteur
    function addCaptor(salleValue) {
        let salle_id = null;
        if (salleValue !== "Non assigné") {
            // Extraire l'ID de la salle à partir du nom (ex: "Salle F119" -> "F119")
            salle_id = salleValue.split(" ")[1];
        }

        fetch("http://localhost:3000/api/captors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ salle_id })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.error || 'Erreur lors de l\'ajout du capteur'); });
            }
            return response.json();
        })
        .then(() => {
            fetchCaptors(); // Recharger la liste après ajout
            populateRoomSelects(); // Mettre à jour les listes déroulantes
        })
        .catch(error => {
            console.error("Erreur lors de l'ajout du capteur :", error.message);
            alert(error.message);
        });
    }

    // Fonction pour modifier un capteur
    function updateCaptor(id, salleValue) {
        let salle_id = null;
        if (salleValue !== "Non assigné") {
            // Extraire l'ID de la salle à partir du nom (ex: "Salle F119" -> "F119")
            salle_id = salleValue.split(" ")[1];
        }

        fetch(`http://localhost:3000/api/captors/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ salle_id })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.error || 'Erreur lors de la modification du capteur'); });
            }
            return response.json();
        })
        .then(data => {
            console.log("Modification réussie:", data);
            fetchCaptors(); // Recharger la liste après modification
            populateRoomSelects(); // Mettre à jour les listes déroulantes
        })
        .catch(error => {
            console.error("Erreur lors de la modification du capteur :", error.message);
            alert(error.message);
        });
    }

    // Fonction pour supprimer un capteur
    function deleteCaptor(id) {
        fetch(`http://localhost:3000/api/captors/${id}`, { method: "DELETE" })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                return response.json();
            })
            .then(() => {
                fetchCaptors(); // Recharger la liste après suppression
                populateRoomSelects(); // Mettre à jour les listes déroulantes
            })
            .catch(error => {
                console.error("Erreur lors de la suppression :", error);
                alert("Erreur lors de la suppression du capteur. Veuillez réessayer.");
            });
    }

    // Gestion du bouton "Retour"
    backToAdminBtn.addEventListener("click", function (e) {
        e.preventDefault(); // Empêche la redirection automatique du lien <a>
        console.log("Retour à la page Admin Dashboard...");
        window.location.href = "admin_dashboard.html"; // Redirige vers admin_dashboard.html
    });

    // Gestion du bouton "Ajouter un capteur"
    document.getElementById("save-captor-btn").addEventListener("click", function () {
        const salleValue = document.getElementById("captor-room").value;
        addCaptor(salleValue);
        document.getElementById("add-captor-modal").style.display = "none";
    });

    // Gestion du bouton pour ouvrir la modale d'ajout
    document.getElementById("add-captor-btn").addEventListener("click", function () {
        document.getElementById("add-captor-modal").style.display = "flex";
    });

    // Gestion du bouton pour ouvrir la modale de modification
    function openEditModal(captorId) {
        fetch(`http://localhost:3000/api/captors/${captorId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                return response.json();
            })
            .then(captor => {
                document.getElementById("edit-captor-id").value = captor.id;
                document.getElementById("edit-captor-room").value = captor.salle_id ? `Salle ${captor.salle_id}` : "Non assigné";
                // Réactiver temporairement les options désactivées pour permettre de sélectionner la salle actuelle
                const editSelect = document.getElementById("edit-captor-room");
                Array.from(editSelect.options).forEach(option => {
                    if (option.value === (captor.salle_id ? `Salle ${captor.salle_id}` : "Non assigné")) {
                        option.disabled = false; // Réactiver l'option correspondant à la salle actuelle
                        option.style.color = "black"; // Assurer que la couleur est normale
                    }
                });
                document.getElementById("edit-captor-modal").style.display = "flex";
            })
            .catch(error => {
                console.error("Erreur lors de la récupération du capteur :", error);
                alert("Erreur lors de l'ouverture de la modale de modification. Veuillez réessayer.");
            });
    }

    // Gestion du bouton "Mettre à jour" dans la modale de modification
    document.getElementById("update-captor-btn").addEventListener("click", function () {
        const id = document.getElementById("edit-captor-id").value;
        const salleValue = document.getElementById("edit-captor-room").value;
        updateCaptor(id, salleValue);
        document.getElementById("edit-captor-modal").style.display = "none";
    });

    // Gestion des boutons pour fermer les modales
    document.querySelectorAll(".close-modal").forEach(button => {
        button.addEventListener("click", function () {
            document.getElementById("add-captor-modal").style.display = "none";
            document.getElementById("edit-captor-modal").style.display = "none";
        });
    });

    // Attacher les événements de suppression et modification
    function attachEventListeners() {
        // Suppression
        document.querySelectorAll(".delete-captor").forEach(button => {
            button.addEventListener("click", function () {
                const captorId = this.getAttribute("data-id");
                deleteCaptor(captorId);
            });
        });

        // Modification
        document.querySelectorAll(".edit-captor").forEach(button => {
            button.addEventListener("click", function () {
                const captorId = this.getAttribute("data-id");
                openEditModal(captorId);
            });
        });
    }

    // Charger les capteurs et les salles au démarrage
    fetchCaptors();
    populateRoomSelects();
});
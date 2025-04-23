const getRooms = async function() {
    try {
        // Récupérer les salles depuis le serveur sur le port 3000
        console.log('Tentative de récupération des salles...');
        const roomsResponse = await fetch('http://localhost:3000/api/salles');
        if (!roomsResponse.ok) {
            console.error('Erreur lors de la récupération des salles, statut:', roomsResponse.status, roomsResponse.statusText);
            throw new Error('Erreur lors de la récupération des salles');
        }
        const rooms = await roomsResponse.json();
        console.log('Salles récupérées:', rooms);

        // Récupérer les capteurs
        console.log('Tentative de récupération des capteurs...');
        const captorsResponse = await fetch('http://localhost:3000/api/captors');
        if (!captorsResponse.ok) {
            console.error('Erreur lors de la récupération des capteurs, statut:', captorsResponse.status, captorsResponse.statusText);
            throw new Error('Erreur lors de la récupération des capteurs');
        }
        const captors = await captorsResponse.json();
        console.log('Capteurs récupérés:', captors);

        // Associer les données des capteurs aux salles
        return rooms.map(room => {
            // Extraire l'identifiant de la salle à partir de room.nom (ex: "Salle F119" -> "F119")
            const roomIdentifier = room.nom.split(" ")[1]; // Prend "F119" de "Salle F119"
            
            // Trouver le premier capteur assigné à cette salle
            const captor = captors.find(c => c.salle_id === roomIdentifier);
            
            return {
                id: room.id,
                name: room.nom, // Utiliser "nom" au lieu de "name"
                quality: captor && captor.qualite_air ? captor.qualite_air : "N/A", // Qualité de l'air depuis le capteur
                graph: "./assets/image_graphique.png", // Valeur par défaut pour le graphique
                details: [
                    { title: "Humidité", value: captor && captor.humidite ? captor.humidite : "N/A", icon: "assets/humidite.png" },
                    { title: "Température", value: captor && captor.temperature ? captor.temperature : "N/A", icon: "assets/temperature.png" },
                    { title: "Micro-particules", value: captor && captor.micro_particules ? captor.micro_particules : "N/A", icon: "assets/particules.png" },
                    { title: "Batterie du capteur", value: captor && captor.battery ? `${captor.battery}%` : "N/A", icon: "assets/batterie.png" }
                ]
            };
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des salles ou des capteurs:', error);
        return [];
    }
};
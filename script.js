document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // == Gestion des Modales (Ouverture / Fermeture) ==
    // =========================================================================
    const modalTriggers = document.querySelectorAll('[data-modal-target]');
    const modalCloses = document.querySelectorAll('[data-modal-close]');

    // Fonction pour ouvrir une modale
    const openModal = (modal) => {
        if (modal) {
            modal.style.display = 'block';
            // Vous pourriez ajouter une classe ici pour des animations CSS
            // document.body.style.overflow = 'hidden'; // Empêcher le scroll du body
        }
    };

    // Fonction pour fermer une modale
    const closeModal = (modal) => {
        if (modal) {
            modal.style.display = 'none';
            // document.body.style.overflow = ''; // Rétablir le scroll du body
        }
    };

    // Ajoute les écouteurs pour OUVRIR les modales via data-modal-target
    // Gère les boutons originaux (ex: header, CTA)
    modalTriggers.forEach(trigger => {
        // On exclut les boutons gérés spécifiquement par le configurateur
        if (!trigger.closest('.composer-package') && trigger.id !== 'goto-devis-alacarte') {
             trigger.addEventListener('click', (event) => {
                event.preventDefault(); // Important pour les liens <a>
                const modalId = trigger.getAttribute('data-modal-target');
                const modal = document.querySelector(modalId);
                if (modal) {
                     openModal(modal);
                } else {
                    console.error("Modale non trouvée pour le sélecteur :", modalId);
                }
            });
        }
    });

    // Ajoute les écouteurs pour FERMER les modales (via le bouton [data-modal-close])
    modalCloses.forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            const modal = closeBtn.closest('.modal'); // Trouve la modale parente
            closeModal(modal);
        });
    });

    // Ajoute l'écouteur pour FERMER les modales (clic en dehors du contenu)
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            closeModal(event.target);
        }
    });

    // =========================================================================
    // == Gestion du Menu Hamburger ==
    // =========================================================================
    const hamburger = document.querySelector('.hamburger-menu');
    const navMenu = document.querySelector('.main-nav');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('open');
            navMenu.classList.toggle('open');
            const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
            hamburger.setAttribute('aria-expanded', !isExpanded);
        });

        // Fermeture du menu mobile au clic sur un lien interne
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (navMenu.classList.contains('open') && link.getAttribute('href').startsWith('#')) {
                    hamburger.classList.remove('open');
                    navMenu.classList.remove('open');
                    hamburger.setAttribute('aria-expanded', 'false');
                }
            });
        });
    }

    // =========================================================================
    // == Logique du Configurateur d'Événement (Estimation Prix) ==
    // =========================================================================

    const numGuestsInput = document.getElementById('num-guests');
    const eventTypeSelect = document.getElementById('event-type-select');
    const servicesForm = document.getElementById('services-selection-form'); // Le formulaire contenant les checkboxes
    const estimatedTotalDisplay = document.getElementById('estimated-total-display');
    const estimatedPriceSpan = document.getElementById('estimated-price');

    // --- DÉFINITION DES PRIX INDICATIFS ---
    // !!! ATTENTION : CES PRIX SONT DES EXEMPLES ET DOIVENT ÊTRE ADAPTÉS PRÉCISÉMENT À VOTRE OFFRE ET AU MARCHÉ PARISIEN !!!
    // Structure : { serviceValue: { fixed: Coût Fixe, perPerson: Coût par Invité, min: Coût Minimum Total, typeFactor: { eventType: Multiplicateur } } }
    const servicePrices = {
        // Lieu & Logistique
        'Recherche Lieu':       { fixed: 600, perPerson: 5, min: 750 }, // Ex: Recherche + petite coordination initiale
        'Location Matériel':    { fixed: 100, perPerson: 18, min: 300 }, // Ex: Tables, chaises Napoléon, vaisselle/verres standards
        'Logistique':           { fixed: 800, perPerson: 3, min: 950 }, // Ex: Planification détaillée hors Jour J

        // Scénographie & Déco
        'Concept Déco':         { fixed: 500, perPerson: 5, min: 600 }, // Ex: Moodboard, planches tendances
        'Déco Florale':         { fixed: 0,   perPerson: 35, min: 800, typeFactor: { 'Mariage': 1.5, 'Soiree Gala': 1.2 } }, // Minimum + plus cher pour certains events
        'Lumières':             { fixed: 700, perPerson: 8, min: 900 }, // Ex: Ambiance lumineuse basique
        'Installation Déco':    { fixed: 400, perPerson: 4, min: 500 }, // Ex: Installation & Désinstallation déco (hors fleurs/lumières spécifiques)

        // Prestataires (Coût recherche/coordination + estimation coût prestataire si inclus)
        'Traiteur':             { fixed: 150, perPerson: 85, min: 2000 }, // Ex: Prix moyen traiteur/pers Paris (cocktail+dîner assis simple) + marge coordination
        'Animations':           { fixed: 500, perPerson: 10, min: 700 }, // Ex: Recherche/Coordination DJ/Photo/Groupe... (n'inclut pas le cachet de l'artiste)
        'Papeterie':            { fixed: 300, perPerson: 6, min: 400 }, // Ex: Création & suivi impression (hors coûts impression)

        // Coordination
        'Coordination Jour J':  { fixed: 1200, perPerson: 8, min: 1500 }, // Ex: Présence et gestion le jour J
        'Gestion Invités':      { fixed: 250, perPerson: 5, min: 350 }  // Ex: Suivi RSVP, communication basique
    };
    // --- FIN DÉFINITION DES PRIX ---

    // Fonction pour calculer l'estimation
    function calculateEstimate() {
        // Vérifier si les éléments nécessaires existent
        if (!numGuestsInput || !eventTypeSelect || !servicesForm || !estimatedTotalDisplay || !estimatedPriceSpan) return;

        const numGuests = parseInt(numGuestsInput.value) || 0;
        const eventType = eventTypeSelect.value;
        let totalEstimate = 0;

        // Ne rien afficher si pas d'invités renseignés
        if (numGuests <= 0) {
             estimatedTotalDisplay.style.display = 'none';
             return;
        }

        const checkedServices = servicesForm.querySelectorAll('input[name="services"]:checked');

        checkedServices.forEach(checkbox => {
            const priceInfo = servicePrices[checkbox.value];
            if (priceInfo) {
                let serviceCost = 0;
                let factor = 1.0;

                // Appliquer le facteur spécifique au type d'événement
                if (priceInfo.typeFactor && priceInfo.typeFactor[eventType]) {
                    factor = priceInfo.typeFactor[eventType];
                }

                // Calculer le coût basé sur fixe et par personne (avec facteur)
                serviceCost = (priceInfo.fixed || 0) + ((priceInfo.perPerson || 0) * numGuests * factor);

                // Appliquer le coût minimum si défini et si le coût calculé est inférieur
                if (priceInfo.min && serviceCost < priceInfo.min) {
                    serviceCost = priceInfo.min;
                }
                totalEstimate += serviceCost;
            }
        });

        // Afficher ou cacher le résultat
        if (totalEstimate > 0) {
            // Arrondir et formater en Euros (€) pour la France
            estimatedPriceSpan.textContent = Math.round(totalEstimate).toLocaleString('fr-FR');
            estimatedTotalDisplay.style.display = 'block';
        } else {
             estimatedTotalDisplay.style.display = 'none';
        }
    }

    // Ajouter les écouteurs d'événements pour recalculer l'estimation
    if (numGuestsInput && eventTypeSelect && servicesForm && estimatedTotalDisplay && estimatedPriceSpan) {
        // Recalculer quand le nombre d'invités ou le type d'événement change
        numGuestsInput.addEventListener('input', calculateEstimate);
        eventTypeSelect.addEventListener('change', calculateEstimate);

        // Recalculer quand une checkbox de service change
        const serviceCheckboxes = servicesForm.querySelectorAll('input[name="services"]');
        serviceCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', calculateEstimate);
        });

         // Gérer les checkboxes de catégorie parente
         const categoryCheckboxes = servicesForm.querySelectorAll('input[type="checkbox"][id^="cat-"]');
         categoryCheckboxes.forEach(catCheckbox => {
            catCheckbox.addEventListener('change', (event) => {
                const categoryDiv = event.target.closest('.service-category');
                if (categoryDiv) {
                    const itemCheckboxes = categoryDiv.querySelectorAll('input[name="services"]');
                    itemCheckboxes.forEach(itemCheckbox => {
                        itemCheckbox.checked = event.target.checked; // Coche/décoche les enfants
                    });
                    calculateEstimate(); // Recalcule après la modification groupée
                }
            });
         });

         // Initialiser l'affichage au chargement (au cas où des valeurs sont pré-remplies)
         calculateEstimate();

    } else {
        console.warn("Éléments du configurateur manquants. L'estimation dynamique est désactivée.");
    }


    // =========================================================================
    // == Pré-remplissage Modale Devis depuis Configurateur ==
    // =========================================================================
    const boutonDevisAlaCarte = document.getElementById('goto-devis-alacarte');
    const boutonDevisSerenite = document.querySelector('.composer-package a[data-modal-target="#devisModal"]');
    const devisModal = document.getElementById('devisModal'); // Référence à la modale Devis

    // Pré-remplissage pour "À la Carte"
    if (boutonDevisAlaCarte && servicesForm && devisModal) {
        const devisModalTextarea = devisModal.querySelector('textarea[name="message"]');
        if (devisModalTextarea) {
            boutonDevisAlaCarte.addEventListener('click', () => {
                const numGuests = numGuestsInput ? (numGuestsInput.value || 'Non précisé') : 'N/A';
                const eventType = eventTypeSelect ? (eventTypeSelect.options[eventTypeSelect.selectedIndex]?.text || 'Non précisé') : 'N/A';

                let selection = `Bonjour,\n\nJe suis intéressé(e) par une formule "À la Carte" pour un événement :\n- Type : ${eventType}\n- Nombre d'invités estimé : ${numGuests}\n\nServices souhaités (sélectionnés via le configurateur) :\n`;
                const checkedServices = servicesForm.querySelectorAll('input[name="services"]:checked');

                if (checkedServices.length > 0) {
                    checkedServices.forEach(checkbox => {
                        selection += "- " + checkbox.value + "\n";
                    });
                } else {
                    selection += "- (Aucun service spécifique coché, je décrirai mes besoins)\n";
                }
                 // Ajouter l'estimation si elle est visible
                if (estimatedTotalDisplay && estimatedTotalDisplay.style.display !== 'none' && estimatedPriceSpan) {
                     selection += `\nEstimation indicative vue sur le site : ${estimatedPriceSpan.textContent} €\n`;
                }

                selection += "\nMerci de me faire une proposition personnalisée.\n";

                devisModalTextarea.value = selection;
                openModal(devisModal); // Ouvre la modale

                // Focus sur le premier champ pour faciliter la saisie
                const firstInput = devisModal.querySelector('input:not([type="hidden"]), select, textarea');
                if (firstInput) setTimeout(() => firstInput.focus(), 100);
            });
        }
    }

    // Pré-remplissage pour "Sérénité"
    if (boutonDevisSerenite && devisModal) {
        const devisModalTextarea = devisModal.querySelector('textarea[name="message"]');
        if (devisModalTextarea) {
            boutonDevisSerenite.addEventListener('click', (event) => {
                event.preventDefault(); // Empêche le lien de suivre href="#"
                 const numGuests = numGuestsInput ? (numGuestsInput.value || 'Non précisé') : 'N/A';
                 const eventType = eventTypeSelect ? (eventTypeSelect.options[eventTypeSelect.selectedIndex]?.text || 'Non précisé') : 'N/A';
                const packageType = boutonDevisSerenite.getAttribute('data-package') || 'Sérénité'; // Récupère le nom du package

                devisModalTextarea.value = `Bonjour,\n\nJe suis intéressé(e) par la formule "${packageType}" pour un événement :\n- Type : ${eventType}\n- Nombre d'invités estimé : ${numGuests}\n\nMerci de me contacter pour discuter de mon projet.\n`;
                openModal(devisModal); // Ouvre la modale

                // Focus sur le premier champ
                const firstInput = devisModal.querySelector('input:not([type="hidden"]), select, textarea');
                if (firstInput) setTimeout(() => firstInput.focus(), 100);
            });
        }
    }

    // =========================================================================
    // == Code Optionnel / Référence ==
    // =========================================================================

    // --- RDV Modal Preference Radio Buttons ---
    // (Pas d'action spécifique requise actuellement, juste pour info)
    // const rdvPreferenceRadios = document.querySelectorAll('#rdvModal input[name="preference"]');
    // rdvPreferenceRadios.forEach(radio => {
    //     radio.addEventListener('change', (event) => {
    //         console.log('Preference RDV changed:', event.target.value);
    //     });
    // });


    // --- FIN DU CODE EXÉCUTÉ APRÈS LE CHARGEMENT DU DOM ---
    console.log("Fadou Events Script Loaded Successfully."); // Message de confirmation dans la console

}); // <-- Fin de l'écouteur 'DOMContentLoaded'
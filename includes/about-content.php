    <!-- Scrollable overlay — the overlay itself scrolls so the modal always fits any screen height -->
    <div id="about-platform-content">
        <div id="aboutModalInner" class="min-h-full flex items-center justify-center p-3 sm:p-6">
        <div class="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-5xl my-4 animate-slide-up relative">

            <!-- Modal Header — compact on mobile -->
            <div class="gradient-bg rounded-t-2xl sm:rounded-t-3xl px-4 py-4 sm:px-8 sm:py-8 text-center relative">

                <div class="flex items-center justify-center gap-3 mb-1 sm:mb-3">
                    <img src="https://i.ibb.co/Cp38FdLC/logo.png" alt="SSC Logo"
                         class="h-10 w-10 sm:h-16 sm:w-16 object-contain bg-white rounded-full p-1.5 sm:p-2 flex-shrink-0">
                    <div class="text-left">
                        <h2 class="text-lg sm:text-2xl md:text-3xl font-bold text-white leading-tight">About This Platform</h2>
                        <p class="text-blue-100 text-xs sm:text-sm mt-0.5">TransFormation &mdash; SSC Information Disclosure System</p>
                    </div>
                </div>
                <p class="hidden sm:block text-blue-100 text-sm max-w-xl mx-auto leading-relaxed mt-2">
                    Developed by SSC officers to promote transparency, financial accountability, and accessible documentation for the CSPC student body.
                </p>
            </div>

            <!-- Developers Grid -->
            <div class="p-3 sm:p-6 md:p-8">
                <p class="text-center text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3 sm:mb-5">
                    Platform Proposers &amp; Developers
                </p>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">

                    <!-- Jeriel Agua -->
                    <div role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}" onclick="openProfileModal('jeriel')" class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-2 sm:p-5 border border-blue-100 flex flex-col items-center text-center gap-2 sm:gap-3 cursor-pointer hover:shadow-lg transition-shadow">
                        <img src="https://i.ibb.co/FLSYqMqP/Jeriel-Agua.png" alt="Jeriel Agua"
                             class="flex-shrink-0 rounded-lg sm:rounded-xl object-cover shadow-md border-2 border-blue-200 w-14 h-20 sm:w-32 sm:h-44"
                             loading="lazy" decoding="async"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="bg-blue-600 rounded-lg sm:rounded-xl flex-shrink-0 flex items-center justify-center shadow-md border-2 border-blue-200 w-14 h-20 sm:w-32 sm:h-44" style="display: none;">
                            <i class="fas fa-bullhorn text-white text-lg sm:text-3xl"></i>
                        </div>
                        <div class="min-w-0 w-full">
                            <h4 class="font-bold text-gray-900 text-xs sm:text-base leading-tight">Jeriel Agua</h4>
                            <p class="text-blue-600 font-semibold text-xs sm:text-sm mb-1 sm:mb-2">PRO</p>
                            <span class="inline-block bg-blue-600 text-white font-medium rounded-full leading-snug"
                                  style="font-size:9px;padding:2px 7px;">
                                <span class="hidden sm:inline">TransFormation: An Information Disclosure System</span>
                                <span class="sm:hidden">TransFormation</span>
                            </span>
                        </div>
                    </div>

                    <!-- Jessil C. Martinez -->
                    <div role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}" onclick="openProfileModal('jessil')" class="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-2 sm:p-5 border border-blue-100 flex flex-col items-center text-center gap-2 sm:gap-3 cursor-pointer hover:shadow-lg transition-shadow">
                        <img src="https://i.ibb.co/WvwNbFN7/Jessil-Martinez.png" alt="Jessil C. Martinez"
                             class="flex-shrink-0 rounded-lg sm:rounded-xl object-cover shadow-md border-2 border-blue-200 w-14 h-20 sm:w-32 sm:h-44"
                             loading="lazy" decoding="async"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="bg-blue-500 rounded-lg sm:rounded-xl flex-shrink-0 flex items-center justify-center shadow-md border-2 border-blue-200 w-14 h-20 sm:w-32 sm:h-44" style="display: none;">
                            <i class="fas fa-coins text-white text-lg sm:text-3xl"></i>
                        </div>
                        <div class="min-w-0 w-full">
                            <h4 class="font-bold text-gray-900 text-xs sm:text-base leading-tight">Jessil C. Martinez</h4>
                            <p class="text-blue-600 font-semibold text-xs sm:text-sm mb-1 sm:mb-2">Treasurer</p>
                            <span class="inline-block bg-blue-600 text-white font-medium rounded-full leading-snug"
                                  style="font-size:9px;padding:2px 7px;">
                                <span class="hidden sm:inline">FinTech: Empowering Financial Transparency</span>
                                <span class="sm:hidden">FinTech</span>
                            </span>
                        </div>
                    </div>

                    <!-- Ralph Joefrancis Abonal -->
                    <div role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}" onclick="openProfileModal('ralph')" class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-2 sm:p-5 border border-blue-100 flex flex-col items-center text-center gap-2 sm:gap-3 cursor-pointer hover:shadow-lg transition-shadow">
                        <img src="https://i.ibb.co/Cp00D5nf/Ralph-Joefrancis-Abonal.png" alt="Ralph Joefrancis Abonal"
                             class="flex-shrink-0 rounded-lg sm:rounded-xl object-cover shadow-md border-2 border-blue-200 w-14 h-20 sm:w-32 sm:h-44"
                             loading="lazy" decoding="async"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="bg-blue-600 rounded-lg sm:rounded-xl flex-shrink-0 flex items-center justify-center shadow-md border-2 border-blue-200 w-14 h-20 sm:w-32 sm:h-44" style="display: none;">
                            <i class="fas fa-pen-nib text-white text-lg sm:text-3xl"></i>
                        </div>
                        <div class="min-w-0 w-full">
                            <h4 class="font-bold text-gray-900 text-xs sm:text-base leading-tight">Ralph Abonal</h4>
                            <p class="text-blue-600 font-semibold text-xs sm:text-sm mb-1 sm:mb-2">Secretary</p>
                            <span class="inline-block bg-blue-600 text-white font-medium rounded-full leading-snug"
                                  style="font-size:9px;padding:2px 7px;">
                                <span class="hidden sm:inline">Document Management and Tracking for Council Files</span>
                                <span class="sm:hidden">Doc. Management</span>
                            </span>
                        </div>
                    </div>

                    <!-- Jancee Kenn Abonita -->
                    <div role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}" onclick="openProfileModal('jancee')" class="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-2 sm:p-5 border border-blue-100 flex flex-col items-center text-center gap-2 sm:gap-3 cursor-pointer hover:shadow-lg transition-shadow">
                        <img src="https://i.ibb.co/5hvDh0Dj/Jancee-Kenn-Abonita.png" alt="Jancee Kenn Abonita"
                             class="flex-shrink-0 rounded-lg sm:rounded-xl object-cover shadow-md border-2 border-blue-200 w-14 h-20 sm:w-32 sm:h-44"
                             loading="lazy" decoding="async"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="bg-blue-500 rounded-lg sm:rounded-xl flex-shrink-0 flex items-center justify-center shadow-md border-2 border-blue-200 w-14 h-20 sm:w-32 sm:h-44" style="display: none;">
                            <i class="fas fa-code text-white text-lg sm:text-3xl"></i>
                        </div>
                        <div class="min-w-0 w-full">
                            <h4 class="font-bold text-gray-900 text-xs sm:text-base leading-tight">Jancee Kenn Abonita</h4>
                            <p class="text-blue-600 font-semibold text-xs sm:text-sm mb-1 sm:mb-2">P.R.O. Technical Director</p>
                            <span class="inline-block bg-blue-600 text-white font-medium rounded-full leading-snug"
                                  style="font-size:9px;padding:2px 7px;">
                                <span class="hidden sm:inline">Platform Architecture &amp; Development Lead</span>
                                <span class="sm:hidden">Development Lead</span>
                            </span>
                        </div>
                    </div>

                    <!-- Joberth Iballar -->
                    <div role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}" onclick="openProfileModal('joberth')" class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-2 sm:p-5 border border-blue-100 flex flex-col items-center text-center gap-2 sm:gap-3 cursor-pointer hover:shadow-lg transition-shadow">
                        <img src="https://i.ibb.co/Qv1rPHBq/Joberth-Iballar.png"
                             alt="Joberth Iballar"
                             class="flex-shrink-0 rounded-lg sm:rounded-xl object-cover shadow-md border-2 border-blue-200 w-14 h-20 sm:w-32 sm:h-44"
                             loading="lazy" decoding="async"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="bg-blue-600 rounded-lg sm:rounded-xl flex-shrink-0 flex items-center justify-center shadow-md border-2 border-blue-200 w-14 h-20 sm:w-32 sm:h-44" style="display: none;">
                            <i class="fas fa-search text-white text-lg sm:text-3xl"></i>
                        </div>
                        <div class="min-w-0 w-full">
                            <h4 class="font-bold text-gray-900 text-xs sm:text-base leading-tight">Joberth Iballar</h4>
                            <p class="text-blue-600 font-semibold text-xs sm:text-sm mb-1 sm:mb-2">Auditor</p>
                            <span class="inline-block bg-blue-600 text-white font-medium rounded-full leading-snug" style="font-size:9px;padding:2px 7px;">
                                <span class="hidden sm:inline">E-Audit Compass</span>
                                <span class="sm:hidden">E-Audit Compass</span>
                            </span>
                        </div>
                    </div>

                </div>

                <p class="text-center text-gray-400 text-xs mt-4 pt-3 sm:mt-6 sm:pt-4 border-t border-gray-100">
                    Academic Year 2025&ndash;2026 &bull; <br> CSPC Supreme Student Council
                </p>
            </div>
        </div>
        </div>
    </div>

    <!-- ============================================================
         INDIVIDUAL PROFILE MODALS
         ============================================================ -->

    <!-- Profile Modal Container -->
    <dialog id="profileModal" class="profile-dialog" aria-labelledby="profileName" onclick="if(event.target===this||event.target.id==='profileModalInner') closeProfileModal()">
        <div id="profileModalInner" class="min-h-full flex items-center justify-center p-3 sm:p-6">
            <div class="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl my-4 animate-slide-up relative">

                <!-- Modal Header -->
                <div class="gradient-bg rounded-t-2xl sm:rounded-t-3xl px-6 py-6 text-center relative">
                    <button onclick="closeProfileModal()" class="absolute top-3 right-4 text-white/70 hover:text-white transition-colors text-xl" aria-label="Close">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="flex flex-col items-center gap-4">
                        <img id="profileImage" src="" alt="" class="w-32 h-44 object-cover rounded-xl shadow-lg border-4 border-white" loading="lazy" decoding="async">
                        <div>
                            <h2 id="profileName" class="text-2xl md:text-3xl font-bold text-white"></h2>
                            <p id="profileCurrentRole" class="text-blue-100 text-sm mt-1"></p>
                        </div>
                    </div>
                </div>

                <!-- Modal Body -->
                <div class="p-6 md:p-8">
                    <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <i class="fas fa-history text-blue-600"></i>
                        Position History
                    </h3>
                    <div id="profileHistory" class="space-y-3">
                        <!-- History items will be inserted here -->
                    </div>
                </div>
            </div>
        </div>
    </dialog>

    <script>
        // Profile data
        const profiles = {
            jeriel: {
                name: 'Jeriel Agua',
                image: 'https://i.ibb.co/FLSYqMqP/Jeriel-Agua.png',
                currentRole: 'P.R.O. AY 2025-2026',
                history: [
                    { year: '2025-2026', position: 'P.R.O.' },
                    { year: '2024-2025', position: 'Assistant P.R.O. Multimedia and Design Officer' }
                ]
            },
            jessil: {
                name: 'Jessil C. Martinez',
                image: 'https://i.ibb.co/WvwNbFN7/Jessil-Martinez.png',
                currentRole: 'Treasurer AY 2025-2026',
                history: [
                    { year: '2025-2026', position: 'Treasurer' },
                    { year: '2024-2025', position: 'Treasurer' }
                ]
            },
            ralph: {
                name: 'Ralph Joefrancis Abonal',
                image: 'https://i.ibb.co/Cp00D5nf/Ralph-Joefrancis-Abonal.png',
                currentRole: 'Secretary AY 2025-2026',
                history: [
                    { year: '2025-2026', position: 'Secretary' },
                    { year: '2024-2025', position: 'Assistant Secretary' }
                ]
            },
            jancee: {
                name: 'Jancee Kenn Abonita',
                image: 'https://i.ibb.co/5hvDh0Dj/Jancee-Kenn-Abonita.png',
                currentRole: 'Assistant P.R.O. Technical Director AY 2025-2026',
                history: [
                    { year: '2025-2026', position: 'Assistant P.R.O. Technical Director' },
                    { year: '2024-2025', position: 'Assistant P.R.O. Multimedia and Design Officer/Technical' }
                ]
            },
            joberth: {
                name: 'Joberth Iballar',
                image: 'https://i.ibb.co/Qv1rPHBq/Joberth-Iballar.png',
                currentRole: 'Auditor AY 2025-2026',
                history: [
                    { year: '2025-2026', position: 'Auditor' },
                    { year: '2024-2025', position: 'Assistant Auditor' },
                    { year: '2023-2024', position: 'Environmental Concerns Committee Director' }
                ]
            }
        };

        function openProfileModal(profileId) {
            const profile = profiles[profileId];
            if (!profile) return;

            // Populate modal
            document.getElementById('profileImage').src = profile.image;
            document.getElementById('profileImage').alt = profile.name;
            document.getElementById('profileName').textContent = profile.name;
            document.getElementById('profileCurrentRole').textContent = profile.currentRole;

            // Build history
            const historyContainer = document.getElementById('profileHistory');
            historyContainer.innerHTML = profile.history.map((item, index) => `
                <div class="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div class="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        ${profile.history.length - index}
                    </div>
                    <div class="flex-1">
                        <p class="font-semibold text-gray-900">${item.position}</p>
                        <p class="text-sm text-gray-600">Academic Year ${item.year}</p>
                    </div>
                </div>
            `).join('');

            // Show modal
            document.getElementById('profileModal').showModal();
            document.body.style.overflow = 'hidden';
        }

        function closeProfileModal() {
            document.getElementById('profileModal').close();
            document.body.style.overflow = '';
        }

        // Close on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeProfileModal();
            }
        });
    </script>


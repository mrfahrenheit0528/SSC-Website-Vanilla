    <!-- Hero Section -->
    <section id="main-content" tabindex="-1" class="gradient-bg relative overflow-hidden">
        <div class="absolute inset-0 bg-black opacity-20"></div>
        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div class="text-white animate-slide-up">
                    <div class="flex items-center space-x-4 mb-6">
                        <img src="https://i.ibb.co/Cp38FdLC/logo.png" alt="CSPC-SSC Logo" class="h-20 w-20 object-contain bg-white rounded-full p-2">
                        <div>
                            <h1 class="text-4xl md:text-5xl font-bold mb-4">CSPC Supreme Student Council</h1>
                            <p class="text-xl text-blue-100">Academic Year 2025-2026</p>
                        </div>
                    </div>
                    <p class="text-lg text-blue-100 mb-8 leading-relaxed">
                        Promoting transparency and student welfare through accessible documentation and information sharing.
                        Empowering students through leadership, service, and advocacy.
                    </p>
                    <div class="flex flex-wrap gap-3 justify-center lg:justify-start">
                        <a href="officers.php"
                           class="text-blue-700 bg-white hover:bg-gray-100 focus:ring-4 focus:ring-white/50 font-semibold rounded-lg text-sm px-6 py-3 text-center transition-colors">
                            <i class="fas fa-users mr-2"></i>View Officers
                        </a>
                        <a href="documents.php"
                           class="text-white bg-white/20 hover:bg-white/30 focus:ring-4 focus:ring-white/30 font-semibold rounded-lg text-sm px-6 py-3 text-center border border-white/40 transition-colors backdrop-blur-sm">
                            <i class="fas fa-users mr-2"></i>Documents
                        </a>
                        <button onclick="document.getElementById('aboutModal').classList.remove('hidden')"
                                class="text-white bg-white/20 hover:bg-white/30 focus:ring-4 focus:ring-white/30 font-semibold rounded-lg text-sm px-6 py-3 text-center border border-white/40 transition-colors backdrop-blur-sm">
                            <i class="fas fa-info-circle mr-2"></i>About Platform
                        </button>
                    </div>
                </div>
                <div class="animate-bounce-in mt-6 lg:mt-0 w-full max-w-xs sm:max-w-sm lg:max-w-full mx-auto">
                    <?php if($event_photo): ?>
                    <div class="rounded-2xl overflow-hidden shadow-2xl border-2 border-white/30">
                        <div class="glass-effect px-4 py-2.5 flex items-center gap-2">
                            <i class="fas fa-calendar-alt text-white"></i>
                            <p class="text-white text-sm font-semibold">Upcoming Event</p>
                        </div>
                        <div class="w-full" style="aspect-ratio:1/1;">
                            <img src="<?php echo htmlspecialchars($event_photo); ?>"
                                 alt="Upcoming Event"
                                 class="w-full h-full object-cover block">
                        </div>
                    </div>
                    <?php else: ?>
                    <div class="glass-effect rounded-2xl p-8 flex flex-col items-center justify-center text-center" style="aspect-ratio:1/1; max-height:320px;">
                        <i class="fas fa-calendar-alt text-5xl text-white/40 mb-4"></i>
                        <p class="text-white font-semibold mb-1">No Upcoming Event</p>
                        <p class="text-blue-100 text-sm">Check back soon for announcements.</p>
                    </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </section>

<?php include __DIR__ . '/home-content.php'; ?>

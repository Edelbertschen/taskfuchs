<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TaskFuchs - Deine intelligente Produktivitäts-App 🦊</title>
    <meta name="description" content="TaskFuchs ist die intelligente Produktivitäts-App, die dir hilft, Aufgaben smart zu organisieren, Projekte zu verwalten und deine Ziele zu erreichen.">
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    
    <!-- Styles -->
    <style>
        :root {
            --primary-color: #e06610;
            --primary-light: #ff7a1a;
            --primary-dark: #cc5200;
            --secondary-color: #1a1a2e;
            --accent-color: #16213e;
            --text-dark: #0f0f23;
            --text-light: #6b7280;
            --bg-light: #fafafa;
            --gradient-primary: linear-gradient(135deg, #e06610 0%, #ff7a1a 100%);
            --gradient-secondary: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            --shadow: 0 20px 60px rgba(224, 102, 16, 0.15);
            --shadow-hover: 0 30px 80px rgba(224, 102, 16, 0.25);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            color: var(--text-dark);
            overflow-x: hidden;
        }

        /* Smooth scrolling */
        html {
            scroll-behavior: smooth;
        }

        /* Navigation */
        .nav {
            position: fixed;
            top: 0;
            width: 100%;
            z-index: 1000;
            padding: 1rem 0;
            transition: all 0.3s ease;
            backdrop-filter: blur(20px);
            background: rgba(255, 255, 255, 0.9);
        }

        .nav.scrolled {
            background: rgba(255, 255, 255, 0.95);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .nav-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 800;
            font-size: 1.5rem;
            color: var(--primary-color);
            text-decoration: none;
        }

        .logo img {
            width: 40px;
            height: 40px;
        }

        .nav-links {
            display: flex;
            gap: 2rem;
            list-style: none;
        }

        .nav-links a {
            text-decoration: none;
            color: var(--text-dark);
            font-weight: 500;
            transition: all 0.3s ease;
            position: relative;
        }

        .nav-links a:hover {
            color: var(--primary-color);
        }

        .nav-links a::after {
            content: '';
            position: absolute;
            bottom: -5px;
            left: 0;
            width: 0;
            height: 2px;
            background: var(--gradient-primary);
            transition: width 0.3s ease;
        }

        .nav-links a:hover::after {
            width: 100%;
        }

        .download-btn-header {
            background: var(--primary-color);
            color: white;
            border: none;
            border-radius: 6px;
            padding: 0.75rem 1.5rem;
            font-weight: 600;
            font-size: 0.9rem;
            text-decoration: none;
            transition: all 0.2s ease;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(224, 102, 16, 0.2);
        }

        .download-btn-header:hover {
            background: #d05a0d;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(224, 102, 16, 0.3);
            color: white !important;
        }

        .nav-links a.download-btn-header {
            color: white !important;
        }

        .nav-links a.download-btn-header:hover {
            color: white !important;
        }

        /* Hero Section */
        .hero {
            min-height: 100vh;
            background: linear-gradient(135deg, #faf9f7 0%, #f8f4f0 50%, #f0e8e0 100%);
            display: flex;
            align-items: center;
            position: relative;
            overflow: hidden;
        }

        .hero::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="0.5" fill="%23e06610" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            z-index: 1;
        }

        .hero-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4rem;
            align-items: center;
            position: relative;
            z-index: 2;
        }

        .hero-content h1 {
            font-size: clamp(2.5rem, 5vw, 4rem);
            font-weight: 800;
            line-height: 1.1;
            margin-bottom: 1.5rem;
            background: var(--gradient-primary);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .hero-content .subtitle {
            font-size: 1.25rem;
            color: var(--text-light);
            margin-bottom: 2rem;
            line-height: 1.5;
        }

        .hero-content .description {
            font-size: 1.1rem;
            color: var(--text-light);
            margin-bottom: 3rem;
            line-height: 1.6;
        }

        .cta-button {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 1rem 2rem;
            background: var(--gradient-primary);
            color: white;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            font-size: 1.1rem;
            transition: all 0.3s ease;
            box-shadow: var(--shadow);
            border: none;
            cursor: pointer;
        }

        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-hover);
        }

        .hero-visual {
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .floating-fox {
            width: 300px;
            height: 300px;
            animation: float 3s ease-in-out infinite;
            filter: drop-shadow(0 20px 40px rgba(224, 102, 16, 0.2));
        }

        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(2deg); }
        }

        .speech-bubble {
            position: absolute;
            top: 20px;
            right: -50px;
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            padding: 1.2rem 1.8rem;
            border-radius: 25px;
            box-shadow: 
                0 15px 35px rgba(0, 0, 0, 0.15),
                0 5px 15px rgba(0, 0, 0, 0.08);
            font-weight: 600;
            font-size: 1rem;
            color: #2c3e50;
            animation: bounce 2s ease-in-out infinite;
            border: 2px solid rgba(224, 102, 16, 0.1);
            max-width: 200px;
            text-align: center;
            line-height: 1.4;
        }

        .speech-bubble::before {
            content: '';
            position: absolute;
            bottom: -12px;
            left: 35px;
            width: 0;
            height: 0;
            border: 12px solid transparent;
            border-top-color: rgba(224, 102, 16, 0.1);
        }

        .speech-bubble::after {
            content: '';
            position: absolute;
            bottom: -8px;
            left: 37px;
            width: 0;
            height: 0;
            border: 10px solid transparent;
            border-top-color: #ffffff;
        }

        @keyframes bounce {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }

        /* Features Section */
        .features {
            padding: 8rem 0;
            background: white;
            position: relative;
        }

        .features-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
        }

        .section-header {
            text-align: center;
            margin-bottom: 4rem;
        }

        .section-header h2 {
            font-size: clamp(2rem, 4vw, 3rem);
            font-weight: 800;
            margin-bottom: 1rem;
            color: var(--secondary-color);
        }

        .section-header p {
            font-size: 1.2rem;
            color: var(--text-light);
            max-width: 600px;
            margin: 0 auto;
        }

        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 2rem;
            margin-bottom: 4rem;
        }

        .feature-card {
            background: white;
            padding: 2.5rem;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            border: 1px solid #f0f0f0;
            position: relative;
            overflow: hidden;
        }

        .feature-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background: var(--gradient-primary);
            transform: scaleX(0);
            transition: transform 0.3s ease;
        }

        .feature-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        }

        .feature-card:hover::before {
            transform: scaleX(1);
        }

        .feature-icon {
            width: 60px;
            height: 60px;
            border-radius: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
            font-size: 2.2rem;
        }

        .feature-card h3 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 1rem;
            color: var(--primary-color);
        }

        .feature-card p {
            color: var(--text-light);
            line-height: 1.6;
        }

        /* Interactive Demo Section */
        .demo-section {
            padding: 8rem 0;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }

        .demo-container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 0 2rem;
        }

        .demo-interface {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
            padding: 3rem;
            margin-top: 3rem;
        }

        .demo-input {
            width: 100%;
            padding: 1.5rem;
            border: 2px solid #e9ecef;
            border-radius: 15px;
            font-size: 1.1rem;
            font-family: inherit;
            transition: all 0.3s ease;
            margin-bottom: 1.5rem;
        }

        .demo-input:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(224, 102, 16, 0.1);
        }

        .demo-button {
            background: var(--gradient-primary);
            color: white;
            border: none;
            padding: 1rem 2rem;
            border-radius: 50px;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-bottom: 2rem;
        }

        .demo-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(224, 102, 16, 0.3);
        }

        .demo-result {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 2rem;
            border-left: 4px solid var(--primary-color);
            display: none;
        }

        .demo-result.show {
            display: block;
            animation: slideIn 0.5s ease;
        }

        @keyframes slideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Screenshots Gallery */
        .gallery {
            padding: 8rem 0;
            background: white;
        }

        .gallery-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
        }

        .screenshots-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-top: 3rem;
        }

        .screenshot-card {
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            cursor: pointer;
        }

        .screenshot-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        }

        .screenshot-card img {
            width: 100%;
            height: 200px;
            object-fit: cover;
        }

        .screenshot-info {
            padding: 1.5rem;
        }

        .screenshot-info h3 {
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: var(--secondary-color);
        }

        .screenshot-info p {
            color: var(--text-light);
            font-size: 0.95rem;
        }

        /* Target Groups */
        .target-groups {
            padding: 8rem 0;
            background: linear-gradient(135deg, var(--secondary-color) 0%, var(--accent-color) 100%);
            color: white;
        }

        .groups-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
        }

        .groups-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 2rem;
            margin-top: 3rem;
        }

        .group-card {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 2rem;
            padding-top: 3rem;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            transition: all 0.3s ease;
            position: relative;
            margin-top: 1rem;
        }

        .group-card:hover {
            transform: translateY(-5px);
            background: rgba(255, 255, 255, 0.15);
        }

        .group-card h3 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 1rem;
            color: var(--primary-light);
        }

        .group-card ul {
            list-style: none;
            margin-top: 1rem;
        }

        .group-card li {
            padding: 0.5rem 0;
            padding-left: 1.5rem;
            position: relative;
        }

        .group-card li::before {
            content: '✓';
            position: absolute;
            left: 0;
            color: var(--primary-light);
            font-weight: bold;
        }

        .group-emoji {
            position: absolute;
            top: -2.5rem;
            left: 50%;
            transform: translateX(-50%);
            width: 5rem;
            height: 5rem;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
            z-index: 2;
        }

        /* Download Section */
        .download-section {
            padding: 6rem 0;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            position: relative;
            overflow: hidden;
        }

        .download-section::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="2" fill="rgba(224,102,16,0.1)"/><circle cx="20" cy="20" r="1" fill="rgba(224,102,16,0.05)"/><circle cx="80" cy="30" r="1.5" fill="rgba(224,102,16,0.07)"/><circle cx="30" cy="80" r="1" fill="rgba(224,102,16,0.05)"/></svg>') repeat;
            animation: float-bg 20s ease-in-out infinite;
        }

        @keyframes float-bg {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }

        .download-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
            text-align: center;
            position: relative;
            z-index: 1;
        }

        .download-section .section-header h2 {
            font-size: 3rem;
            font-weight: 800;
            color: var(--secondary-color);
            margin-bottom: 1rem;
        }

        .download-section .section-header p {
            font-size: 1.2rem;
            color: var(--text-light);
            margin-bottom: 3rem;
        }

        .download-buttons {
            display: flex;
            justify-content: center;
            gap: 1rem;
            max-width: 600px;
            margin: 0 auto;
            flex-wrap: wrap;
        }

        .download-btn {
            background: #ffffff;
            border: 1px solid #e1e5e9;
            border-radius: 8px;
            padding: 1.25rem 2rem;
            text-decoration: none;
            color: var(--secondary-color);
            transition: all 0.2s ease;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            display: flex;
            align-items: center;
            min-width: 180px;
            justify-content: center;
        }

        .download-btn:hover {
            border-color: var(--primary-color);
            box-shadow: 0 4px 12px rgba(224, 102, 16, 0.15);
            transform: translateY(-1px);
        }

        .download-btn-icon {
            font-size: 1.25rem;
            color: var(--text-light);
            display: flex;
            align-items: center;
            transition: color 0.2s ease;
        }

        .download-btn:hover .download-btn-icon {
            color: var(--primary-color);
        }

        .download-btn-content {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        }

        .download-btn-title {
            font-size: 0.95rem;
            font-weight: 600;
            margin: 0;
            line-height: 1.2;
        }

        .download-btn-subtitle {
            font-size: 0.75rem;
            color: var(--text-light);
            opacity: 0.7;
            margin: 0;
            line-height: 1.2;
        }

        /* Download Modal */
        .download-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .download-modal.show {
            opacity: 1;
        }

        .download-modal-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.7);
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border-radius: 25px;
            padding: 3rem 2rem;
            max-width: 500px;
            width: 90%;
            text-align: center;
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.3);
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }

        .download-modal.show .download-modal-content {
            transform: translate(-50%, -50%) scale(1);
        }

        .download-modal-content::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: conic-gradient(from 0deg, transparent, rgba(224, 102, 16, 0.1), transparent);
            animation: rotate-gradient 4s linear infinite;
        }

        @keyframes rotate-gradient {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        .download-modal-inner {
            position: relative;
            z-index: 1;
            background: white;
            border-radius: 20px;
            padding: 2rem;
        }

        .download-modal-close {
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: none;
            border: none;
            font-size: 2rem;
            cursor: pointer;
            color: var(--text-light);
            transition: color 0.3s ease;
            z-index: 2;
        }

        .download-modal-close:hover {
            color: var(--primary-color);
        }

        .download-modal h3 {
            font-size: 2rem;
            font-weight: 800;
            color: var(--secondary-color);
            margin-bottom: 1rem;
        }

        .download-modal p {
            font-size: 1.1rem;
            color: var(--text-light);
            line-height: 1.6;
            margin-bottom: 2rem;
        }

        .coming-soon-badge {
            background: var(--gradient-primary);
            color: white;
            padding: 0.5rem 1.5rem;
            border-radius: 50px;
            font-weight: 600;
            font-size: 0.9rem;
            display: inline-block;
            margin-bottom: 1rem;
            animation: glow-badge 2s ease-in-out infinite alternate;
        }

        @keyframes glow-badge {
            from { box-shadow: 0 0 10px rgba(224, 102, 16, 0.3); }
            to { box-shadow: 0 0 20px rgba(224, 102, 16, 0.6); }
        }

        /* Footer */
        .footer {
            background: var(--secondary-color);
            color: white;
            padding: 4rem 0 2rem;
        }

        .footer-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
            text-align: center;
        }

        .footer-logo {
            font-size: 2rem;
            font-weight: 800;
            margin-bottom: 1rem;
            color: var(--primary-light);
        }

        .footer p {
            color: #a0a0a0;
            margin-bottom: 2rem;
        }



        .copyright {
            padding-top: 2rem;
            border-top: 1px solid #333;
            color: #666;
        }

        .legal-links-small {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 0.5rem;
            margin-top: 1rem;
            font-size: 0.8rem;
        }

        .legal-links-small a {
            color: rgba(255, 255, 255, 0.5);
            text-decoration: none;
            transition: color 0.3s ease;
        }

        .legal-links-small a:hover {
            color: rgba(255, 255, 255, 0.8);
        }

        .legal-links-small span {
            color: rgba(255, 255, 255, 0.3);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .nav-links {
                display: none;
            }

            .hero-container {
                grid-template-columns: 1fr;
                text-align: center;
                gap: 2rem;
            }

            .features-grid {
                grid-template-columns: 1fr;
            }

            .groups-grid {
                grid-template-columns: 1fr;
            }

            .screenshots-grid {
                grid-template-columns: 1fr;
            }

            .speech-bubble {
                right: 10px;
                font-size: 0.9rem;
            }

            .download-buttons {
                flex-direction: column;
                gap: 0.75rem;
                align-items: center;
            }
            
            .download-btn {
                width: 100%;
                max-width: 320px;
            }

            .download-section .section-header h2 {
                font-size: 2.5rem;
            }

            .download-modal-content {
                margin: 0 1rem;
                padding: 2rem 1.5rem;
            }

            .download-modal h3 {
                font-size: 1.5rem;
            }
        }

        /* Parallax Effects */
        .parallax-element {
            transition: transform 0.1s ease-out;
        }

        /* Loading Animation */
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* Language Toggle */
        .lang-toggle-container {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .lang-label {
            font-weight: 500;
            color: #6b7280;
            font-size: 0.9rem;
            transition: all 0.3s ease;
        }

        .lang-toggle {
            position: relative;
            display: inline-block;
            width: 50px;
            height: 24px;
        }

        .lang-toggle input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .lang-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #d1d5db;
            border-radius: 24px;
            transition: all 0.3s ease;
        }

        .lang-slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            border-radius: 50%;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .lang-toggle input:checked + .lang-slider {
            background-color: #9ca3af;
        }

        .lang-toggle input:checked + .lang-slider:before {
            transform: translateX(26px);
        }

        /* Utility Classes */
        .text-gradient {
            background: var(--gradient-primary);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .mb-2 { margin-bottom: 1rem; }
        .mb-4 { margin-bottom: 2rem; }
        .text-center { text-align: center; }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav class="nav" id="navbar">
        <div class="nav-container">
            <a href="#home" class="logo">
                <img src="assets/images/Fuchs.svg" alt="TaskFuchs Logo">
                TaskFuchs
            </a>
            <ul class="nav-links">
                <li><a href="#features" data-i18n="nav-features">Funktionen</a></li>
                <li><a href="#demo" data-i18n="nav-demo">Demo</a></li>
                <li><a href="#gallery" data-i18n="nav-gallery">Screenshots</a></li>
                <li><a href="#zielgruppen" data-i18n="nav-groups">Zielgruppen</a></li>
                <li><a href="#download" class="download-btn-header">Download</a></li>
                <li>
                    <div class="lang-toggle-container">
                        <span class="lang-label" id="lang-de">DE</span>
                        <label class="lang-toggle">
                            <input type="checkbox" id="langToggle">
                            <span class="lang-slider"></span>
                        </label>
                        <span class="lang-label" id="lang-en">EN</span>
                    </div>
                </li>
            </ul>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero" id="home">
        <div class="hero-container">
            <div class="hero-content parallax-element">
                <h1>Produktivität war noch nie so smart 🦊</h1>
                <p class="subtitle">Die intelligente App, die deine Aufgaben versteht</p>
                <p class="description">
                    TaskFuchs ist dein persönlicher Produktivitäts-Assistent. Mit smarter Aufgabeneingabe, 
                    intelligentem Projektmanagement und einem charmanten Fuchs an deiner Seite erreichst du 
                    deine Ziele effizienter denn je.
                </p>
                <a href="#demo" class="cta-button">
                    Jetzt ausprobieren
                </a>
            </div>
            <div class="hero-visual parallax-element">
                <img src="assets/images/Fuchs.svg" alt="TaskFuchs Maskottchen" class="floating-fox">
                <div class="speech-bubble" data-i18n="hero-speech">
                    Lass uns deine Produktivität revolutionieren
                </div>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section class="features" id="features">
        <div class="features-container">
            <div class="section-header">
                <h2>Funktionen, die begeistern</h2>
                <p>TaskFuchs bietet alles, was du für maximale Produktivität brauchst</p>
            </div>
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">🧠</div>
                    <h3>SMART-Aufgaben erstellen</h3>
                    <p>Verwandle vage Ideen in konkrete, messbare Ziele. Unser intelligenter Parser analysiert deine Eingaben und erstellt automatisch SMART-Ziele mit Deadlines, Prioritäten und Kontext.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">📊</div>
                    <h3>Projekte organisieren</h3>
                    <p>Verwalte komplexe Projekte mit Kanban-Boards, benutzerdefinierten Spalten und intelligenter Aufgabenverteilung. Behalte den Überblick über Fortschritte und Deadlines.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">⏰</div>
                    <h3>Deadline-Management</h3>
                    <p>Nie wieder wichtige Termine verpassen. Intelligente Erinnerungen, visuelle Deadline-Anzeigen und automatische Priorisierung basierend auf Dringlichkeit.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🎯</div>
                    <h3>Intelligente Priorisierung</h3>
                    <p>Automatische Aufgabenpriorisierung basierend auf Deadlines, Wichtigkeit und verfügbarer Zeit. Der Fokus-Modus hilft dir, dich auf das Wesentliche zu konzentrieren.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">⏱️</div>
                    <h3>Eingebauter Timer</h3>
                    <p>Pomodoro-Timer, Zeiterfassung und detaillierte Statistiken über deine Arbeitsgewohnheiten. Optimiere deine Produktivität mit datenbasierten Insights.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🔔</div>
                    <h3>Smart Notifications</h3>
                    <p>Intelligente Benachrichtigungen, die sich an deinen Arbeitsrhythmus anpassen. Reminder, die motivieren statt zu nerven.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">📝</div>
                    <h3>Notizen & Dokumentation</h3>
                    <p>Verknüpfe Notizen mit Aufgaben, erstelle Markdown-Dokumentation und sammle all deine Gedanken an einem Ort.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🏷️</div>
                    <h3>Tag-System</h3>
                    <p>Organisiere Aufgaben mit flexiblen Tags, erstelle Filter und finde schnell, was du suchst.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">📈</div>
                    <h3>Detaillierte Statistiken</h3>
                    <p>Umfassende Analyse deiner Produktivität mit Trends, Effizienz-Metriken und personalisierten Insights.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🔄</div>
                    <h3>Wiederkehrende Aufgaben</h3>
                    <p>Automatisiere regelmäßige Tasks mit flexiblen Wiederholungsmustern und intelligenter Zeitplanung.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">📱</div>
                    <h3>Cross-Platform</h3>
                    <p>Nahtlose Synchronisation zwischen Desktop und Mobile. Deine Aufgaben sind immer dabei.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🌙</div>
                    <h3>Dark Mode & Themes</h3>
                    <p>Personalisiere dein Erlebnis mit verschiedenen Themes und einem augenfreundlichen Dark Mode.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Interactive Demo Section -->
    <section class="demo-section" id="demo">
        <div class="demo-container">
            <div class="section-header">
                <h2>Probiere es live aus!</h2>
                <p>Erlebe die SMART-Aufgabenerstellung in Aktion</p>
            </div>
            <div class="demo-interface">
                <h3 class="mb-2">SMART-Aufgabe erstellen</h3>
                <p class="mb-4" style="color: var(--text-light);">
                    Gib eine beliebige Aufgabe ein und sieh zu, wie TaskFuchs sie in ein SMART-Ziel verwandelt:
                </p>
                <input 
                    type="text" 
                    class="demo-input" 
                    id="taskInput"
                    placeholder="z.B. 'Website für Kunden erstellen bis nächste Woche'"
                >
                <button class="demo-button" onclick="generateSmartTask()">
                    <span id="buttonText">🧠 SMART-Ziel generieren</span>
                </button>
                <div class="demo-result" id="result">
                    <!-- Result will be populated by JavaScript -->
                </div>
            </div>
        </div>
    </section>

    <!-- Screenshots Gallery -->
    <section class="gallery" id="gallery">
        <div class="gallery-container">
            <div class="section-header">
                <h2>TaskFuchs in Aktion</h2>
                <p>Entdecke die intuitive Benutzeroberfläche und leistungsstarken Features</p>
            </div>
            <div class="screenshots-grid">
                <div class="screenshot-card">
                    <img src="public/screenshots/dashboard.png" alt="TaskFuchs Dashboard">
                    <div class="screenshot-info">
                        <h3>Übersichtliches Dashboard</h3>
                        <p>Alle wichtigen Informationen auf einen Blick - Today-View, Statistiken und aktuelle Projekte.</p>
                    </div>
                </div>
                <div class="screenshot-card">
                    <img src="public/screenshots/kanban.png" alt="Kanban Board">
                    <div class="screenshot-info">
                        <h3>Kanban-Projektmanagement</h3>
                        <p>Organisiere deine Projekte visuell mit anpassbaren Kanban-Boards und Drag & Drop.</p>
                    </div>
                </div>
                <div class="screenshot-card">
                    <img src="public/screenshots/smart.png" alt="SMART-Aufgaben">
                    <div class="screenshot-info">
                        <h3>SMART-Aufgabenerstellung</h3>
                        <p>Intelligente Aufgabenanalyse verwandelt vage Ideen in konkrete, messbare Ziele.</p>
                    </div>
                </div>
                <div class="screenshot-card">
                    <img src="public/screenshots/notes.png" alt="Notizen System">
                    <div class="screenshot-info">
                        <h3>Integrierte Notizen</h3>
                        <p>Verknüpfe Notizen mit Aufgaben und behalte alle wichtigen Informationen im Kontext.</p>
                    </div>
                </div>
                <div class="screenshot-card">
                    <img src="public/screenshots/settings.png" alt="Einstellungen">
                    <div class="screenshot-info">
                        <h3>Anpassbare Einstellungen</h3>
                        <p>Personalisiere TaskFuchs nach deinen Bedürfnissen - von Themes bis hin zu Workflows.</p>
                    </div>
                </div>
                <div class="screenshot-card">
                    <img src="public/screenshots/mobile.png" alt="Mobile App">
                    <div class="screenshot-info">
                        <h3>Mobile Optimierung</h3>
                        <p>Vollständige Funktionalität auch unterwegs - responsive Design für alle Geräte.</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Target Groups -->
    <section class="target-groups" id="zielgruppen">
        <div class="groups-container">
            <div class="section-header">
                <h2 style="color: white;">Perfekt für jeden Workflow</h2>
                <p style="color: rgba(255, 255, 255, 0.8);">
                    TaskFuchs passt sich an deine individuellen Bedürfnisse an
                </p>
            </div>
            <div class="groups-grid">
                <div class="group-card">
                    <div class="group-emoji">🚀</div>
                    <h3>Freelancer & Selbstständige</h3>
                    <p>Behalte den Überblick über Kundenprojekte, Deadlines und Abrechnungen.</p>
                    <ul>
                        <li>Kundenakquise strukturieren und verfolgen</li>
                        <li>Projektplanung für Webentwicklung oder Design</li>
                        <li>Rechnungsstellung und Buchhaltung organisieren</li>
                        <li>Content-Creation-Pipelines optimieren</li>
                    </ul>
                </div>
                <div class="group-card">
                    <div class="group-emoji">🎓</div>
                    <h3>Studierende</h3>
                    <p>Meistere dein Studium mit intelligenter Planung und Zeitmanagement.</p>
                    <ul>
                        <li>Abschlussarbeit strukturiert planen und schreiben</li>
                        <li>Prüfungsvorbereitung mit Lernplänen</li>
                        <li>Gruppenprojekte koordinieren</li>
                        <li>Praktikumssuche und Bewerbungen verwalten</li>
                    </ul>
                </div>
                <div class="group-card">
                    <div class="group-emoji">💼</div>
                    <h3>Projektmanager:innen</h3>
                    <p>Führe Teams und Projekte erfolgreich mit datenbasierten Insights.</p>
                    <ul>
                        <li>Agile Entwicklungsprojekte steuern</li>
                        <li>Marketingkampagnen von A bis Z planen</li>
                        <li>Produktlaunches koordinieren</li>
                        <li>Stakeholder-Management optimieren</li>
                    </ul>
                </div>
                <div class="group-card">
                    <div class="group-emoji">🏢</div>
                    <h3>Agenturen & Teams</h3>
                    <p>Koordiniere komplexe Projekte und halte alle Beteiligten auf dem Laufenden.</p>
                    <ul>
                        <li>Kundenprojekte transparent verwalten</li>
                        <li>Kreativprozesse strukturieren</li>
                        <li>Ressourcenplanung optimieren</li>
                        <li>Qualitätssicherung implementieren</li>
                    </ul>
                </div>
                <div class="group-card">
                    <div class="group-emoji">🏠</div>
                    <h3>Privatpersonen</h3>
                    <p>Bringe Ordnung in deinen Alltag und erreiche persönliche Ziele.</p>
                    <ul>
                        <li>Hausrenovierung oder Umzug planen</li>
                        <li>Hochzeit oder Events organisieren</li>
                        <li>Fitness-Ziele und Gesundheit tracken</li>
                        <li>Finanzplanung und Sparziele verfolgen</li>
                    </ul>
                </div>
                <div class="group-card">
                    <div class="group-emoji">💡</div>
                    <h3>Kreative & Content Creator</h3>
                    <p>Verwandle kreative Ideen in strukturierte Projekte mit messbaren Erfolgen.</p>
                    <ul>
                        <li>Content-Kalender für Social Media</li>
                        <li>Buchprojekte oder Blogs strukturieren</li>
                        <li>Kunstprojekte und Ausstellungen planen</li>
                        <li>Brand Building und Community Management</li>
                    </ul>
                </div>
            </div>
        </div>
    </section>

    <!-- Download Section -->
    <section class="download-section" id="download">
        <div class="download-container">
            <div class="section-header">
                <h2>Lade TaskFuchs herunter</h2>
                <p>Verfügbar für alle deine Geräte - bald auch als native App</p>
            </div>
            <div class="download-buttons">
                <div class="download-btn" onclick="openDownloadModal('macos')">
                    <div class="download-btn-content">
                        <div class="download-btn-title">macOS</div>
                        <div class="download-btn-subtitle">Für Mac Computer</div>
                    </div>
                </div>
                <div class="download-btn" onclick="openDownloadModal('windows')">
                    <div class="download-btn-content">
                        <div class="download-btn-title">Windows</div>
                        <div class="download-btn-subtitle">Für PC & Laptop</div>
                    </div>
                </div>
                <div class="download-btn" onclick="openDownloadModal('linux')">
                    <div class="download-btn-content">
                        <div class="download-btn-title">Linux</div>
                        <div class="download-btn-subtitle">Für alle Distributionen</div>
                    </div>
                </div>
                <a class="download-btn" href="https://app.taskfuchs.de" target="_blank" rel="noopener">
                    <div class="download-btn-content">
                        <div class="download-btn-title">Web App</div>
                        <div class="download-btn-subtitle">Im Browser nutzen</div>
                    </div>
                </a>
            </div>
            <div class="webapp-info" style="margin-top:16px">
                <p><strong>Web App:</strong> <a href="https://app.taskfuchs.de" target="_blank" rel="noopener">app.taskfuchs.de</a></p>
                <ul style="margin-top:8px; line-height:1.6">
                    <li>Desktop (Chrome/Edge): Menü „App installieren“/„Installieren“.</li>
                    <li>iOS (Safari): Teilen → „Zum Home‑Bildschirm“.</li>
                    <li>Android (Chrome): Drei‑Punkte‑Menü → „App installieren“.</li>
                </ul>
            </div>
        </div>
    </section>

    <!-- Download Modal -->
    <div id="downloadModal" class="download-modal" onclick="closeDownloadModal()">
        <div class="download-modal-content" onclick="event.stopPropagation()">
            <button class="download-modal-close" onclick="closeDownloadModal()">&times;</button>
            <div class="download-modal-inner">
                <div class="coming-soon-badge">Bald verfügbar</div>
                <h3 id="modalTitle">TaskFuchs für [OS]</h3>
                <p id="modalText">
                    Wir arbeiten hart daran, TaskFuchs für alle Plattformen verfügbar zu machen. 
                    Die native App wird bald veröffentlicht und bietet noch bessere Performance und Integration.
                </p>
                <p>
                    <strong>Möchtest du benachrichtigt werden?</strong><br>
                    Folge uns oder trage dich in unseren Newsletter ein, um als Erste:r informiert zu werden!
                </p>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <footer class="footer">
        <div class="footer-container">
            <div class="footer-logo">TaskFuchs</div>
            <p>Die intelligente Produktivitäts-App, die deine Ziele erreicht</p>
            <div class="copyright">
                <p>&copy; 2025 TaskFuchs. Made with ❤️ for productivity enthusiasts.</p>
                <div class="legal-links-small">
                    <a href="impressum.html">Impressum</a>
                    <span>|</span>
                    <a href="datenschutz.html">Datenschutzerklärung</a>
                </div>
            </div>
        </div>
    </footer>

    <!-- JavaScript -->
    <script>
        // Navigation scroll effect
        window.addEventListener('scroll', () => {
            const navbar = document.getElementById('navbar');
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });

        // Parallax effect
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const parallaxElements = document.querySelectorAll('.parallax-element');
            
            parallaxElements.forEach(element => {
                const speed = element.getAttribute('data-speed') || 0.5;
                const yPos = -(scrolled * speed);
                element.style.transform = `translateY(${yPos}px)`;
            });
        });

        // SMART Task Generator
        function generateSmartTask() {
            const input = document.getElementById('taskInput');
            const result = document.getElementById('result');
            const button = document.querySelector('.demo-button');
            const buttonText = document.getElementById('buttonText');
            
            const task = input.value.trim();
            
            if (!task) {
                alert('Bitte gib eine Aufgabe ein!');
                return;
            }

            // Show loading
            buttonText.innerHTML = '<span class="loading"></span> Analysiere...';
            button.disabled = true;

            // Simulate processing
            setTimeout(() => {
                const smartTask = parseTaskToSMART(task);
                displayResult(smartTask);
                
                // Reset button
                buttonText.innerHTML = '🧠 SMART-Ziel generieren';
                button.disabled = false;
            }, 1500);
        }

        function parseTaskToSMART(task) {
            // Enhanced SMART task parsing logic
            const words = task.toLowerCase().split(' ');
            
            // Extract time indicators
            const timeIndicators = {
                'heute': 'heute',
                'morgen': 'morgen',
                'woche': 'eine Woche',
                'monat': 'einen Monat',
                'montag': 'Montag',
                'dienstag': 'Dienstag',
                'mittwoch': 'Mittwoch',
                'donnerstag': 'Donnerstag',
                'freitag': 'Freitag',
                'samstag': 'Samstag',
                'sonntag': 'Sonntag'
            };
            
            let timeframe = 'in 7 Tagen';
            for (const word of words) {
                if (timeIndicators[word]) {
                    timeframe = timeIndicators[word];
                    break;
                }
            }
            
            // Determine priority based on keywords
            const urgentWords = ['sofort', 'dringend', 'wichtig', 'heute', 'asap'];
            const priority = urgentWords.some(word => task.toLowerCase().includes(word)) ? 'Hoch' : 'Mittel';
            
            // Extract action verbs and enhance task description
            const actionVerbs = {
                'erstellen': 'entwickeln und fertigstellen',
                'schreiben': 'verfassen und überarbeiten',
                'planen': 'strukturiert vorbereiten',
                'organisieren': 'systematisch ordnen',
                'lernen': 'studieren und verstehen',
                'kaufen': 'recherchieren und erwerben'
            };
            
            let enhancedAction = task;
            for (const [verb, enhancement] of Object.entries(actionVerbs)) {
                if (task.toLowerCase().includes(verb)) {
                    enhancedAction = task.replace(new RegExp(verb, 'gi'), enhancement);
                    break;
                }
            }
            
            // Generate context-aware subtasks
            const subtasks = generateSubtasks(task);
            
            return {
                original: task,
                specific: enhancedAction,
                measurable: generateMeasurableCriteria(task),
                achievable: `Realistisch umsetzbar mit verfügbaren Ressourcen`,
                relevant: generateRelevanceStatement(task),
                timeBound: `Deadline: ${timeframe}`,
                priority: priority,
                estimatedTime: generateTimeEstimate(task),
                subtasks: subtasks,
                tags: generateTags(task)
            };
        }

        function generateMeasurableCriteria(task) {
            if (task.toLowerCase().includes('website')) {
                return 'Vollständige Website mit mindestens 5 Seiten, responsivem Design und funktionierender Navigation';
            } else if (task.toLowerCase().includes('lernen')) {
                return 'Abschluss von 80% des Lernmaterials mit bestandenem Test (mind. 75%)';
            } else if (task.toLowerCase().includes('schreiben')) {
                return 'Fertiggestellter Text mit mindestens 1000 Wörtern, korrigiert und formatiert';
            }
            return 'Aufgabe zu 100% abgeschlossen mit dokumentierten Ergebnissen';
        }

        function generateRelevanceStatement(task) {
            if (task.toLowerCase().includes('kunde')) {
                return 'Trägt zur Kundenzufriedenheit und Geschäftsentwicklung bei';
            } else if (task.toLowerCase().includes('lernen') || task.toLowerCase().includes('studium')) {
                return 'Wichtig für persönliche Weiterentwicklung und Karriereziele';
            } else if (task.toLowerCase().includes('website') || task.toLowerCase().includes('projekt')) {
                return 'Strategisch wichtig für Unternehmensziele und Portfolio';
            }
            return 'Unterstützt persönliche/berufliche Ziele und Prioritäten';
        }

        function generateTimeEstimate(task) {
            if (task.toLowerCase().includes('website')) return '15-20 Stunden';
            if (task.toLowerCase().includes('lernen')) return '8-12 Stunden';
            if (task.toLowerCase().includes('schreiben')) return '6-10 Stunden';
            if (task.toLowerCase().includes('planen')) return '3-5 Stunden';
            return '5-8 Stunden';
        }

        function generateSubtasks(task) {
            if (task.toLowerCase().includes('website')) {
                return [
                    'Anforderungen analysieren und Wireframes erstellen',
                    'Design-Mockups entwickeln',
                    'Frontend-Entwicklung umsetzen',
                    'Content erstellen und einpflegen',
                    'Testing und Optimierung durchführen'
                ];
            } else if (task.toLowerCase().includes('lernen')) {
                return [
                    'Lernmaterialien sammeln und strukturieren',
                    'Lernplan mit Meilensteinen erstellen',
                    'Tägliche Lerneinheiten durchführen',
                    'Zwischentests zur Selbstkontrolle',
                    'Gelerntes in der Praxis anwenden'
                ];
            }
            return [
                'Aufgabe in Teilschritte gliedern',
                'Benötigte Ressourcen identifizieren',
                'Einzelne Schritte systematisch abarbeiten',
                'Zwischenergebnisse überprüfen',
                'Finales Ergebnis dokumentieren'
            ];
        }

        function generateTags(task) {
            const tags = [];
            const taskLower = task.toLowerCase();
            
            if (taskLower.includes('website') || taskLower.includes('web')) tags.push('Webentwicklung');
            if (taskLower.includes('kunde')) tags.push('Kundenprojekt');
            if (taskLower.includes('lernen') || taskLower.includes('studium')) tags.push('Bildung');
            if (taskLower.includes('dringend') || taskLower.includes('wichtig')) tags.push('Priorität');
            if (taskLower.includes('projekt')) tags.push('Projekt');
            if (taskLower.includes('schreiben')) tags.push('Content');
            
            return tags.length > 0 ? tags : ['Allgemein'];
        }

        function displayResult(smartTask) {
            const result = document.getElementById('result');
            
            result.innerHTML = `
                <h3 style="color: var(--primary-color); margin-bottom: 1rem;">✨ Dein SMART-Ziel</h3>
                
                <div style="background: white; padding: 1.5rem; border-radius: 10px; margin-bottom: 1rem; border-left: 4px solid var(--primary-color);">
                    <h4 style="margin-bottom: 0.5rem; color: var(--secondary-color);">📋 Spezifisch (Specific)</h4>
                    <p>${smartTask.specific}</p>
                </div>
                
                <div style="background: white; padding: 1.5rem; border-radius: 10px; margin-bottom: 1rem; border-left: 4px solid #28a745;">
                    <h4 style="margin-bottom: 0.5rem; color: var(--secondary-color);">📊 Messbar (Measurable)</h4>
                    <p>${smartTask.measurable}</p>
                </div>
                
                <div style="background: white; padding: 1.5rem; border-radius: 10px; margin-bottom: 1rem; border-left: 4px solid #17a2b8;">
                    <h4 style="margin-bottom: 0.5rem; color: var(--secondary-color);">✅ Erreichbar (Achievable)</h4>
                    <p>${smartTask.achievable}</p>
                </div>
                
                <div style="background: white; padding: 1.5rem; border-radius: 10px; margin-bottom: 1rem; border-left: 4px solid #6f42c1;">
                    <h4 style="margin-bottom: 0.5rem; color: var(--secondary-color);">🎯 Relevant</h4>
                    <p>${smartTask.relevant}</p>
                </div>
                
                <div style="background: white; padding: 1.5rem; border-radius: 10px; margin-bottom: 1.5rem; border-left: 4px solid #dc3545;">
                    <h4 style="margin-bottom: 0.5rem; color: var(--secondary-color);">⏰ Terminiert (Time-bound)</h4>
                    <p>${smartTask.timeBound}</p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="background: white; padding: 1rem; border-radius: 10px; text-align: center;">
                        <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">⚡</div>
                        <div style="font-weight: 600; color: var(--secondary-color);">Priorität</div>
                        <div style="color: var(--text-light);">${smartTask.priority}</div>
                    </div>
                    <div style="background: white; padding: 1rem; border-radius: 10px; text-align: center;">
                        <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">⏱️</div>
                        <div style="font-weight: 600; color: var(--secondary-color);">Geschätzte Zeit</div>
                        <div style="color: var(--text-light);">${smartTask.estimatedTime}</div>
                    </div>
                </div>
                
                <div style="background: white; padding: 1.5rem; border-radius: 10px; margin-bottom: 1rem;">
                    <h4 style="margin-bottom: 1rem; color: var(--secondary-color);">📝 Teilaufgaben</h4>
                    <ul style="list-style: none; padding: 0;">
                        ${smartTask.subtasks.map(subtask => `
                            <li style="padding: 0.5rem 0; border-bottom: 1px solid #f0f0f0; position: relative; padding-left: 1.5rem;">
                                <span style="position: absolute; left: 0; color: var(--primary-color);">▢</span>
                                ${subtask}
                            </li>
                        `).join('')}
                    </ul>
                </div>
                
                <div style="background: white; padding: 1.5rem; border-radius: 10px;">
                    <h4 style="margin-bottom: 1rem; color: var(--secondary-color);">🏷️ Empfohlene Tags</h4>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        ${smartTask.tags.map(tag => `
                            <span style="background: var(--gradient-primary); color: white; padding: 0.25rem 0.75rem; border-radius: 15px; font-size: 0.9rem;">
                                ${tag}
                            </span>
                        `).join('')}
                    </div>
                </div>
                
                <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(224, 102, 16, 0.1); border-radius: 10px; border: 1px solid rgba(224, 102, 16, 0.2);">
                    <p style="margin: 0; color: var(--primary-dark); font-weight: 500;">
                        🦊 <strong>TaskFuchs-Tipp:</strong> So würde diese Aufgabe in der echten App strukturiert und organisiert werden!
                    </p>
                </div>
            `;
            
            result.classList.add('show');
        }

        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Animation on scroll
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Observe all cards and sections
        document.querySelectorAll('.feature-card, .screenshot-card, .group-card').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'all 0.6s ease';
            observer.observe(el);
        });

        // Allow Enter key to trigger demo
        document.getElementById('taskInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                generateSmartTask();
            }
        });

        // Language switching functionality
        let currentLang = 'de';

        const translations = {
            de: {
                'nav-features': 'Funktionen',
                'nav-demo': 'Demo',
                'nav-gallery': 'Screenshots',
                'nav-groups': 'Zielgruppen',
                'hero-title': 'Produktivität war noch nie so smart 🦊',
                'hero-subtitle': 'Die intelligente App, die deine Aufgaben versteht',
                'hero-description': 'TaskFuchs ist dein persönlicher Produktivitäts-Assistent. Mit smarter Aufgabeneingabe, intelligentem Projektmanagement und einem charmanten Fuchs an deiner Seite erreichst du deine Ziele effizienter denn je.',
                'hero-cta': 'Jetzt ausprobieren',
                'hero-speech': 'Lass uns deine Produktivität revolutionieren! 🚀'
            },
            en: {
                'nav-features': 'Features',
                'nav-demo': 'Demo',
                'nav-gallery': 'Screenshots',
                'nav-groups': 'Target Groups',
                'hero-title': 'Productivity has never been this smart 🦊',
                'hero-subtitle': 'The intelligent app that understands your tasks',
                'hero-description': 'TaskFuchs is your personal productivity assistant. With smart task input, intelligent project management, and a charming fox by your side, you reach your goals more efficiently than ever.',
                'hero-cta': 'Try it now',
                'hero-speech': 'Let\'s revolutionize your productivity! 🚀'
            }
        };

        function switchLanguage(lang) {
            currentLang = lang;
            
            // Update all elements with data-i18n attributes
            document.querySelectorAll('[data-i18n]').forEach(element => {
                const key = element.getAttribute('data-i18n');
                if (translations[lang] && translations[lang][key]) {
                    element.textContent = translations[lang][key];
                }
            });

            // Update specific elements
            const heroTitle = document.querySelector('.hero-content h1');
            const heroSubtitle = document.querySelector('.hero-content .subtitle');
            const heroDescription = document.querySelector('.hero-content .description');
            const heroCta = document.querySelector('.hero-content .cta-button');
            const heroSpeech = document.querySelector('.speech-bubble');

            if (heroTitle) heroTitle.textContent = translations[lang]['hero-title'];
            if (heroSubtitle) heroSubtitle.textContent = translations[lang]['hero-subtitle'];
            if (heroDescription) heroDescription.textContent = translations[lang]['hero-description'];
            if (heroCta) heroCta.textContent = translations[lang]['hero-cta'];
            if (heroSpeech) heroSpeech.textContent = translations[lang]['hero-speech'];
        }

        function toggleLanguage() {
            const toggle = document.getElementById('langToggle');
            const newLang = toggle.checked ? 'en' : 'de';
            switchLanguage(newLang);
        }

        // Initialize language toggle
        document.addEventListener('DOMContentLoaded', function() {
            const langToggle = document.getElementById('langToggle');
            if (langToggle) {
                langToggle.addEventListener('change', toggleLanguage);
            }
            
            // Initialize with German
            switchLanguage('de');
        });

        // Download Modal Functions
        function openDownloadModal(platform) {
            const modal = document.getElementById('downloadModal');
            const modalTitle = document.getElementById('modalTitle');
            
            // Set platform-specific content
            const platformConfig = {
                macos: { name: 'macOS' },
                windows: { name: 'Windows' },
                linux: { name: 'Linux' }
            };
            
            const config = platformConfig[platform] || platformConfig.macos;
            modalTitle.textContent = `TaskFuchs für ${config.name}`;
            
            // Show modal with animation
            modal.style.display = 'block';
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
            
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        }

        function closeDownloadModal() {
            const modal = document.getElementById('downloadModal');
            
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }, 300);
        }

        // Close modal on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeDownloadModal();
            }
        });
    </script>
</body>
</html> 
 OpenAccessible Shopify Widget

OpenAccessible Shopify Widget
=============================

Add the **OpenAccessible accessibility widget** to any Shopify store to improve accessibility and help websites move toward **WCAG 2.1 / 2.2 AA compliance**.

OpenAccessible provides accessibility tools such as **text-to-speech, contrast adjustments, dyslexia fonts, translation, reading guides, and more**, helping make websites easier to use for people with disabilities.

This version is built specifically for **Shopify themes** and does **not require installing a Shopify app**.

* * *

🌐 Project Links
----------------

*   [Website](https://openaccessible.com)
*   [Documentation](https://openaccessible.com/docs)
*   [Support](https://openaccessible.com/support)
*   [Main Repository](https://github.com/openaccessible/openaccessible)
*   [Shopify Integration](https://github.com/openaccessible/shopify)

* * *

✨ Features
----------

OpenAccessible includes **30+ accessibility tools**.

### Visual Adjustments

*   High contrast mode
*   Dark mode
*   Invert colors
*   Grayscale mode
*   Highlight links
*   Highlight headings

### Reading Assistance

*   Dyslexia-friendly font
*   Adjustable font size
*   Line height controls
*   Letter spacing controls
*   Text alignment tools

### Assistive Technology

*   Text-to-speech reader
*   Reading guide
*   Reading mask
*   Stop animations

### Language Tools

*   Translation support
*   Multi-language interface

### Accessibility Navigation

*   Keyboard navigation tools
*   Focus outlines
*   Skip navigation helpers

* * *

📦 Installation
---------------

OpenAccessible can be installed into Shopify by adding **two files** to your theme. No apps or external services are required.

* * *

1\. Download the Repository
---------------------------

    git clone https://github.com/openaccessible/shopify
    

Or download the ZIP from GitHub.

* * *

2\. Upload the JavaScript File
------------------------------

Go to:

    Shopify Admin
    Online Store
    Themes
    Edit Code
    Assets
    

Upload the file:

    openaccessible.js
    

* * *

3\. Add the Liquid Snippet
--------------------------

Open the **Snippets** folder.

Create a snippet called:

    openaccessible.liquid
    

Paste the following code:

    <script>
    window.OpenAccessibleConfig = {
      dictionaryApiUrl: "https://api.openaccessible.com/api/v1/"
    };
    </script>
    
    <script src="{{ 'openaccessible.js' | asset_url }}" defer></script>
    

* * *

4\. Enable the Widget
---------------------

Open:

    layout/theme.liquid
    

Add the snippet before the closing `</body>` tag:

    {% render 'openaccessible' %}
    

Save the file.

* * *

✅ Finished
----------

The OpenAccessible widget should now appear on your Shopify store. Visitors will see the **accessibility icon button** which opens the accessibility tools panel.

* * *

⚙️ Configuration
----------------

You can customize the widget inside the snippet configuration.

    window.OpenAccessibleConfig = {
      position: "right",
      color: "#2563eb",
      dictionaryApiUrl: "https://api.openaccessible.com/api/v1/"
    };
    

* * *

📊 Accessibility Goals
----------------------

*   WCAG 2.1 AA
*   WCAG 2.2 AA
*   ADA accessibility guidelines
*   Section 508 accessibility requirements

Accessibility widgets do **not replace full accessibility audits**, but they provide helpful accessibility tools for visitors.

* * *

🧩 Compatibility
----------------

*   Shopify Online Store 2.0
*   Dawn
*   Debut
*   Most modern Shopify themes

The widget uses:

*   JavaScript
*   CSS variables
*   Web APIs
*   localStorage

No external dependencies are required.

* * *

🔒 Privacy
----------

OpenAccessible does **not collect personal user data**.

User accessibility preferences are stored locally using:

    localStorage

Examples include:

*   font size preference
*   contrast mode
*   reading tools

* * *

🛠 Development
--------------

    git clone https://github.com/openaccessible/shopify
    

Edit the widget source:

    assets/openaccessible.js

Test using a **Shopify development store**.

* * *

🤝 Contributing
---------------

*   Improve accessibility tools
*   Fix bugs
*   Add translations
*   Improve documentation

Submit pull requests on GitHub.

* * *

⭐ Support the Project
---------------------

If you find OpenAccessible useful:

*   Star the repository
*   Share it with developers
*   Contribute improvements

* * *

📜 License
----------

OpenAccessible is open-source software licensed under the **AGPL-3.0 License**.

* * *

♿ About OpenAccessible
----------------------

OpenAccessible is an **open-source accessibility platform** designed to make the web more accessible.

The project provides:

*   Accessibility widgets
*   WCAG tools
*   Developer APIs
*   Platform integrations

Supported platforms include:

*   Standard websites
*   Shopify
*   WooCommerce
*   Laravel
*   Next.js (coming soon)

**Making the web accessible for everyone.**

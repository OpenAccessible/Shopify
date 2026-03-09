 OpenAccessible Shopify Widget

♿ OpenAccessible Shopify Widget
===============================

The **OpenAccessible widget** adds accessibility tools to Shopify websites. It helps improve usability for visitors with disabilities and supports **WCAG 2.1 / WCAG 2.2 AA accessibility goals**.

Features include:

*   Text-to-speech
*   Font resizing
*   Dyslexia font
*   Color contrast controls
*   Reading guide
*   Translation tools
*   Accessibility navigation helpers

This integration works directly with Shopify themes and does not require installing a Shopify app.

* * *

📦 Installation (Visual Studio / VS Code)
-----------------------------------------

These instructions assume you have your Shopify theme open in **Visual Studio Code** using the Shopify CLI or a downloaded theme.

* * *

Step 1 — Open Your Shopify Theme
--------------------------------

Open your theme folder in Visual Studio Code.

Your Shopify theme structure should look similar to this:

theme/  
├── assets/  
├── config/  
├── layout/  
├── locales/  
├── sections/  
├── snippets/  
└── templates/

* * *

Step 2 — Add the JavaScript File
--------------------------------

Open the folder:

assets

Add the file:

openaccessible.js

Example structure:

assets/  
├── theme.js  
├── theme.css  
└── openaccessible.js

* * *

Step 3 — Add the Snippet
------------------------

Open the folder:

snippets

Create a new file:

openaccessible.liquid

Example folder structure:

snippets/  
├── header.liquid  
├── footer.liquid  
└── openaccessible.liquid

Paste the following code into **openaccessible.liquid**:
```
<script>
window.OpenAccessibleConfig = {
  dictionaryApiUrl: "https://api.openaccessible.com/api/v1/"
};
</script>

<script src="{{ 'openaccessible.js' | asset\_url }}" defer></script>

```

Step 4 — Enable the Widget
--------------------------

Open the file:

layout/theme.liquid

Scroll to the bottom of the file and find:

</body>

Add this line above it:

{% render 'openaccessible' %}

Example:

{% render 'openaccessible' %}
</body>

* * *

📂 Final Folder Structure
-------------------------

Your theme should now include:

theme/  
├── assets/  
│ └── openaccessible.js  
│  
├── snippets/  
│ └── openaccessible.liquid  
│  
└── layout/  
└── theme.liquid

* * *

✅ Installation Complete
-----------------------

The OpenAccessible widget should now appear on your Shopify website.

Visitors will see the accessibility icon button that opens the accessibility tools panel.

* * *

⚙️ Configuration
----------------

You can customize the widget configuration inside the snippet:

window.OpenAccessibleConfig = {
  position: "right",
  color: "#2563eb",
  dictionaryApiUrl: "https://api.openaccessible.com/api/v1/"
};

* * *

🧩 Compatibility
----------------

Works with most Shopify themes including:

*   Dawn
*   Debut
*   Online Store 2.0 themes
*   Most modern custom themes

* * *

🔒 Privacy
----------

OpenAccessible does not collect personal data.

User accessibility preferences are stored locally using:

localStorage

* * *

🤝 Contributing
---------------

*   Improve accessibility tools
*   Fix bugs
*   Add translations
*   Improve documentation

* * *

📜 License
----------

Licensed under the **AGPL-3.0 License**.

* * *

♿ About OpenAccessible
----------------------

OpenAccessible is an open-source accessibility platform designed to make the web easier to use for everyone.

Supported platforms include:

*   Standard websites
*   Shopify
*   WooCommerce
*   Laravel
*   Next.js (coming soon)

**Making the web accessible for everyone.**

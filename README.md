 OpenAccessible Shopify Widget

♿ OpenAccessible Shopify Widget
===============================

The **OpenAccessible Widget** adds accessibility tools to Shopify stores to help improve usability for visitors with disabilities and move toward **WCAG 2.1 / WCAG 2.2 AA accessibility goals**.

The widget includes tools like:

*   Text-to-Speech
*   Contrast & color controls
*   Dyslexia font
*   Reading guide
*   Translation
*   Font resizing
*   Accessibility navigation helpers

This version works with **Shopify themes** and does **not require installing an app**.

* * *

🌐 Links
--------

*   [Website](https://openaccessible.com)
*   [Documentation](https://openaccessible.com/docs)
*   [Support](https://openaccessible.com/support)
*   [Main Repository](https://github.com/openaccessible/openaccessible)
*   [Shopify Version](https://github.com/openaccessible/shopify)

* * *

📦 Installation Guide
---------------------

Installing the OpenAccessible widget requires adding **one JavaScript file** and **one Liquid snippet** to your Shopify theme.

Total install time: **about 2 minutes**.

* * *

Step 1 — Open Theme Code Editor
-------------------------------

Log into your Shopify admin panel.

Navigate to:

Shopify Admin
 → Online Store
   → Themes
     → Click "..." on your active theme
       → Edit Code

This will open the Shopify **theme code editor**.

* * *

Step 2 — Upload the JavaScript File
-----------------------------------

Inside the code editor locate the folder:

Assets

Click:

Add a new asset → Upload file

Upload the file:

openaccessible.js

The file will now appear in:

Assets/
 └ openaccessible.js

* * *

Step 3 — Create the Snippet
---------------------------

Locate the folder:

Snippets

Click:

Add a new snippet

Name the snippet:

openaccessible

This creates:

Snippets/
 └ openaccessible.liquid

Paste the following code into the snippet:

<script>
window.OpenAccessibleConfig = {
  dictionaryApiUrl: "https://api.openaccessible.com/api/v1/"
};
</script>

<script src="{{ 'openaccessible.js' | asset\_url }}" defer></script>

Save the file.

* * *

Step 4 — Enable the Widget in the Theme
---------------------------------------

Open the theme layout file:

Layout/
 └ theme.liquid

Scroll to the bottom of the file and find:

</body>

Add the snippet **right before it**:

{% render 'openaccessible' %}

Example:

{% render 'openaccessible' %}
</body>

Save the file.

* * *

✅ Installation Complete
-----------------------

The OpenAccessible widget will now appear on your Shopify store.

Visitors will see the accessibility icon button which opens the accessibility control panel.

* * *

⚙️ Optional Configuration
-------------------------

You can customize the widget inside the snippet configuration.

window.OpenAccessibleConfig = {
  position: "right",
  color: "#2563eb",
  dictionaryApiUrl: "https://api.openaccessible.com/api/v1/"
};

Options may include:

*   Widget position
*   Widget color
*   API configuration

* * *

🧩 Compatibility
----------------

Works with most Shopify themes including:

*   Dawn
*   Debut
*   Shopify Online Store 2.0 themes
*   Most modern custom themes

* * *

🔒 Privacy
----------

OpenAccessible does not collect personal data.

Accessibility preferences are saved locally using:

localStorage

Examples include:

*   font size preference
*   contrast settings
*   reading tools

* * *

🤝 Contributing
---------------

We welcome community contributions.

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

OpenAccessible is an open-source accessibility platform designed to help websites become easier to use for everyone.

Supported platforms include:

*   Standard websites
*   Shopify
*   WooCommerce
*   Laravel
*   Next.js (coming soon)

**Making the web accessible for everyone.**

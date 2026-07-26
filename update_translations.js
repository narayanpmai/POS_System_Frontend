const fs = require('fs');
const path = require('path');

const localesPath = path.join(__dirname, 'src', 'locales');

const updates = {
  common: {
    en: {
      id: "ID",
      start_date: "Start Date",
      end_date: "End Date",
      saving: "Saving...",
      items: "Items"
    },
    ne: {
      id: "आईडी",
      start_date: "सुरु मिति",
      end_date: "अन्त्य मिति",
      saving: "बचत गर्दै...",
      items: "वस्तुहरू"
    }
  },
  fiscal_years: {
    en: {
      fy_name: "Fiscal Year Name",
      edit_fy: "Edit Fiscal Year",
      add_fy: "Add Fiscal Year"
    },
    ne: {
      fy_name: "आर्थिक वर्षको नाम",
      edit_fy: "आर्थिक वर्ष सम्पादन गर्नुहोस्",
      add_fy: "आर्थिक वर्ष थप्नुहोस्"
    }
  },
  auth: {
    en: {
      login: "Login",
      dont_have_account: "Don't have an account?",
      register: "Register",
      register_subtitle: "Create a new account",
      confirm_password: "Confirm Password",
      already_have_account: "Already have an account?"
    },
    ne: {
      login: "लगइन",
      dont_have_account: "खाता छैन?",
      register: "दर्ता गर्नुहोस्",
      register_subtitle: "नयाँ खाता सिर्जना गर्नुहोस्",
      confirm_password: "पासवर्ड यकिन गर्नुहोस्",
      already_have_account: "पहिले नै खाता छ?"
    }
  },
  pos: {
    en: {
      search_product: "Search product...",
      stock: "Stock",
      walk_in_customer: "Walk-in Customer",
      cart_empty: "Cart is empty",
      sub_total: "Sub Total",
      discount: "Discount",
      cash: "Cash",
      card: "Card",
      qr: "QR",
      register_customer: "Register Customer"
    },
    ne: {
      search_product: "उत्पादन खोज्नुहोस्...",
      stock: "स्टक",
      walk_in_customer: "वाक-इन ग्राहक",
      cart_empty: "कार्ट खाली छ",
      sub_total: "उप-कुल",
      discount: "छुट",
      cash: "नगद",
      card: "कार्ड",
      qr: "QR",
      register_customer: "ग्राहक दर्ता गर्नुहोस्"
    }
  }
};

for (const [namespace, langs] of Object.entries(updates)) {
  for (const [lang, translations] of Object.entries(langs)) {
    const filePath = path.join(localesPath, lang, `${namespace}.json`);
    let data = {};
    if (fs.existsSync(filePath)) {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    
    data = { ...data, ...translations };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Updated ${lang}/${namespace}.json`);
  }
}

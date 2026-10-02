# Store preset edits only

A preset that the user has not modified follows the default rules of the installed version, so new default rules reach every user who has not edited that preset. Storage keeps a preset's rule list only when it differs from the current default rules, and Restore defaults removes that list. We rejected storing a full copy of every preset's rules, because that freezes the defaults at install time and no update could improve them.

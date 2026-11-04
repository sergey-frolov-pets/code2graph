import { both, lines, same, type LanguagePrimer } from "@/languages/primers/shared";

export const WIREMARK_PRIMER: LanguagePrimer = {
  types: [
    {
      id: "wireframe",
      titleKey: "llm.wizard.type.wireframe",
      summaryKey: "llm.wizard.typeDesc.wireframe",
      syntaxKey: "site.primer.wiremark.syntax.wireframe",
      example: both(
        lines(
          "Wireframe #login mobile",
          "  Stack column gap=2",
          '    Typography h4 "Вход"',
          '    TextField "Почта"',
          '    Button "Войти" contained',
        ),
        lines(
          "Wireframe #login mobile",
          "  Stack column gap=2",
          '    Typography h4 "Sign in"',
          '    TextField "Email"',
          '    Button "Sign in" contained',
        ),
      ),
    },
    {
      id: "flow",
      titleKey: "site.primer.wiremark.type.flow.title",
      summaryKey: "site.primer.wiremark.type.flow.summary",
      syntaxKey: "site.primer.wiremark.syntax.flow",
      example: both(
        lines(
          "Flow LR",
          "Wireframe #login mobile",
          '  Button "Дальше" contained to=#home',
          "Wireframe #home mobile",
          '  Typography h4 "Главная"',
        ),
        lines(
          "Flow LR",
          "Wireframe #login mobile",
          '  Button "Next" contained to=#home',
          "Wireframe #home mobile",
          '  Typography h4 "Home"',
        ),
      ),
    },
  ],
  keywords: [
    {
      id: "wireframe",
      token: "Wireframe",
      hintKey: "site.primer.wiremark.kw.wireframe",
      example: same("Wireframe #login mobile"),
    },
    {
      id: "flow",
      token: "Flow",
      hintKey: "site.primer.wiremark.kw.flow",
      example: same("Flow LR"),
    },
    {
      id: "stack",
      token: "Stack",
      hintKey: "site.primer.wiremark.kw.stack",
      example: same("Stack column gap=2"),
    },
    {
      id: "typography",
      token: "Typography",
      hintKey: "site.primer.wiremark.kw.typography",
      example: both('Typography h4 "Вход"', 'Typography h4 "Sign in"'),
    },
    {
      id: "textfield",
      token: "TextField",
      hintKey: "site.primer.wiremark.kw.textfield",
      example: both('TextField "Почта" required', 'TextField "Email" required'),
    },
    {
      id: "button",
      token: "Button",
      hintKey: "site.primer.wiremark.kw.button",
      example: both(
        'Button "Войти" contained to=#home',
        'Button "Sign in" contained to=#home',
      ),
    },
  ],
};

import type { BuiltinSnippet } from "@/types/snippets";

export const WIREMARK_BUILTIN_SNIPPETS: BuiltinSnippet[] = [
  {
    id: "wiremark-screen-mobile",
    language: "wiremark",
    categoryId: "wireframe",
    titleKey: "snippets.builtin.wiremarkScreenMobile",
    descriptionKey: "snippets.builtin.wiremarkScreenMobileDesc",
    content: `Wireframe #screen mobile
  Stack column gap=2
    Typography h4 "Sign in"
    TextField "Email" startIcon=Email required
    TextField "Password" startIcon=Lock required
    Button "Continue" contained fullWidth`,
  },
  {
    id: "wiremark-appbar-drawer",
    language: "wiremark",
    categoryId: "wireframe",
    titleKey: "snippets.builtin.wiremarkAppBarDrawer",
    descriptionKey: "snippets.builtin.wiremarkAppBarDrawerDesc",
    content: `AppBar dense denseBackground
  Toolbar dense
    Icon Menu
    Typography h6 "Workspace"
    Spacer
    Avatar "U" small rounded
Stack row 100% * gap=2
  Drawer
    List dense subheader="Navigation"
      ListItem "Overview" to=#home
      ListItem "Settings" to=#settings`,
  },
  {
    id: "wiremark-form-controls",
    language: "wiremark",
    categoryId: "components",
    titleKey: "snippets.builtin.wiremarkFormControls",
    descriptionKey: "snippets.builtin.wiremarkFormControlsDesc",
    content: `Grid cols=2 gap=2
  TextField "First name" required
  TextField "Email" startIcon=Email required
Select "Role" value="Editor"
  Option "Viewer"
  Option "Editor" selected
Stack row gap=1
  Control checkbox checked
  Typography body2 "Send notifications"`,
  },
  {
    id: "wiremark-card-kpi",
    language: "wiremark",
    categoryId: "charts",
    titleKey: "snippets.builtin.wiremarkCardKpi",
    descriptionKey: "snippets.builtin.wiremarkCardKpiDesc",
    content: `Grid cols=3 gap=2
  Card
    CardHeader "Active users" subheader="Last 7 days" icon=ShowChart closeIcon=none
    CardContent
      Chart "Trend" line 100% 110px legend series=3
    CardActions
      Button "Details" small
      Chip "+14%" small`,
  },
  {
    id: "wiremark-data-table",
    language: "wiremark",
    categoryId: "components",
    titleKey: "snippets.builtin.wiremarkDataTable",
    descriptionKey: "snippets.builtin.wiremarkDataTableDesc",
    content: `Table small
  TableHead
    TableRow
      TableCell "Name"
      TableCell "Status"
      TableCell "Updated" align=right
  TableBody
    TableRow selected
      TableCell "Checkout"
      TableCell "Ready"
      TableCell "Today" align=right`,
  },
  {
    id: "wiremark-dialog",
    language: "wiremark",
    categoryId: "wireframe",
    titleKey: "snippets.builtin.wiremarkDialog",
    descriptionKey: "snippets.builtin.wiremarkDialogDesc",
    content: `Dialog sm
  DialogHeader "Confirm action"
  DialogContent
    Typography body2 "Are you sure you want to proceed?"
  DialogActions
    Spacer
    Button "Cancel"
    Button "Confirm" contained`,
  },
  {
    id: "wiremark-navigation-flow",
    language: "wiremark",
    categoryId: "flowchart",
    titleKey: "snippets.builtin.wiremarkNavigationFlow",
    descriptionKey: "snippets.builtin.wiremarkNavigationFlowDesc",
    content: `Flow LR

Wireframe #list mobile
  Stack column gap=2
    Typography h5 "Projects"
    Button "Open item" contained to=#detail

Wireframe #detail mobile
  Stack column gap=2
    Link "Back" to=#list
    Typography h5 "Project details"`,
  },
];

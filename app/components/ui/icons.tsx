import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Command,
  CreditCard,
  Dot,
  File,
  FileText,
  HelpCircle,
  Image,
  Laptop,
  LayoutDashboard,
  Loader2,
  LogOut,
  Moon,
  MoreVertical,
  Pencil,
  Plus,
  PlusCircle,
  Settings,
  SunMedium,
  Trash,
  User,
  X,
  Save,
  Home,
  ArrowUp,
  ArrowDown,
  EyeOff,
  Eye,
  Building,
  Copy,
  Menu,
  BriefcaseBusiness,
  Database,
  Play,
  ArrowLeft,
  TextCursorInput,
  BarChart,
  RefreshCw,
  Upload,
  Download,
  Calendar,
  AlertOctagon,
  Gauge,
  Goal,
  Table as TableIcon,
  Link,
  FileBarChart,
  DatabaseZap,
  List,
  MonitorDot,
  Shield,
  BellRing,
  HeartPulse,
  Timer,
  Unplug,
  Key,
  Filter,
  type Icon as LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type Icon = LucideIcon;

export const Icons = {
  logo: Command,
  close: X,
  spinner: Loader2,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  trash: Trash,
  settings: Settings,
  billing: CreditCard,
  ellipsis: MoreVertical,
  add: Plus,
  warning: AlertTriangle,
  help: HelpCircle,
  user: User,
  arrowRight: ArrowRight,
  sun: SunMedium,
  moon: Moon,
  laptop: Laptop,
  dashboard: LayoutDashboard,
  page: File,
  media: Image,
  logOut: LogOut,
  check: Check,
  clock: Clock,
  edit: Pencil,
  plusCircle: PlusCircle,
  dots: Dot,
  text: FileText,
  save: Save,
  home: Home,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  eyeOff: EyeOff,
  eye: Eye,
  building: Building,
  copy: Copy,
  menu: Menu,
  briefcase: BriefcaseBusiness,
  database: Database,
  play: Play,
  arrowLeft: ArrowLeft,
  textInput: TextCursorInput,
  chart: BarChart,
  refresh: RefreshCw,
  upload: Upload,
  download: Download,
  calendar: Calendar,
  alert: AlertOctagon,
  gauge: Gauge,
  goal: Goal,
  table: TableIcon,
  link: Link,
  report: FileBarChart,
  databaseQuality: DatabaseZap,
  list: List,
  monitoring: MonitorDot,
  shield: Shield,
  bell: BellRing,
  health: HeartPulse,
  timer: Timer,
  connections: Unplug,
  key: Key,
  filter: Filter,
};

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

export function Icon({ className, name, ...props }: IconProps & { name: keyof typeof Icons }) {
  const IconComponent = Icons[name];
  if (!IconComponent) return null;
  
  return <IconComponent className={cn(className)} {...props} />;
}
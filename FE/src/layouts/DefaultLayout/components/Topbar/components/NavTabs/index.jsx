import { NavLink } from "react-router";
import { cn } from "~/lib/utils";

function NavTabs({ tabs }) {
  // return (
  //   <nav className="flex items-center gap-0.5">
  //     {tabs.map((tab) => (
  //       <NavLink
  //         key={tab.id}
  //         to={tab.path}
  //         className={({ isActive }) =>
  //           cn(
  //             "relative rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-150",
  //             isActive
  //               ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
  //               : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  //           )
  //         }
  //       >
  //         {tab.label}
  //       </NavLink>
  //     ))}
  //   </nav>
  // );
}

export default NavTabs;

import React, { createContext, useContext, useEffect, useState } from "react";

const RoutingContext = createContext({
  pathname: window.location.hash ? window.location.hash.slice(1) : window.location.pathname || "/",
  navigate: () => {},
  params: {},
  searchParams: new URLSearchParams(),
});

export function RoutingProvider({ children }) {
  const [currentPath, setCurrentPath] = useState(() => {
    if (window.location.hash) {
      return window.location.hash.slice(1) || "/";
    }
    return window.location.pathname || "/";
  });

  useEffect(() => {
    const handleHashChange = () => {
      const p = window.location.hash ? window.location.hash.slice(1) : window.location.pathname || "/";
      setCurrentPath(p || "/");
    };
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
    };
  }, []);

  const navigate = (to) => {
    if (typeof to === "string") {
      window.location.hash = to;
      setCurrentPath(to);
    }
  };

  const contextValue = {
    pathname: currentPath,
    navigate,
    params: {},
    searchParams: new URLSearchParams(window.location.search),
  };

  return (
    <RoutingContext.Provider value={contextValue}>
      {children}
    </RoutingContext.Provider>
  );
}

export function useNavigate() {
  const ctx = useContext(RoutingContext);
  return ctx.navigate || ((to) => { window.location.hash = to; });
}

export function useLocation() {
  const ctx = useContext(RoutingContext);
  return { pathname: ctx.pathname || "/", search: "", hash: "" };
}

export function useParams() {
  const ctx = useContext(RoutingContext);
  return ctx.params || {};
}

export function useSearchParams() {
  const [params, setParams] = useState(new URLSearchParams(window.location.search));
  return [params, setParams];
}

export function NavLink({ to, className, children, ...props }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = location.pathname === to;
  const activeClass = typeof className === "function" ? className({ isActive }) : `${className || ""} ${isActive ? "active" : ""}`;

  return (
    <a
      href={`#${to}`}
      className={activeClass}
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
      }}
      {...props}
    >
      {children}
    </a>
  );
}

export function Navigate({ to }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to);
  }, [to, navigate]);
  return null;
}

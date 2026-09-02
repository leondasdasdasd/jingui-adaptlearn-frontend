import React, { useEffect, useState } from "react";
import { useNavigate } from "../routing";

export function Switch({ children }) {
  const [hash, setHash] = useState(() => window.location.hash.slice(1) || "/");

  useEffect(() => {
    const onChange = () => setHash(window.location.hash.slice(1) || "/");
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const childArray = React.Children.toArray(children);
  for (const child of childArray) {
    if (!React.isValidElement(child)) continue;
    const { path, exact, from } = child.props;
    if (path) {
      if (matchPath(hash, path, exact)) {
        return child;
      }
    } else if (from) {
      if (matchPath(hash, from, exact)) {
        return child;
      }
    } else {
      return child;
    }
  }
  return null;
}

export function Route({ path, render, component: Component }) {
  return render ? render({}) : Component ? <Component /> : null;
}

export function Redirect({ to, from, exact }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (to) {
      navigate(to);
    }
  }, [to, navigate]);
  return null;
}

function matchPath(pathname, path, exact = false) {
  if (!path) return true;
  if (path === pathname) return true;
  if (path.includes(":")) {
    const pathParts = path.split("/").filter(Boolean);
    const pathnameParts = pathname.split("/").filter(Boolean);
    if (pathParts.length !== pathnameParts.length) return false;
    return pathParts.every((part, i) => part.startsWith(":") || part === pathnameParts[i]);
  }
  if (!exact && pathname.startsWith(path)) return true;
  return false;
}

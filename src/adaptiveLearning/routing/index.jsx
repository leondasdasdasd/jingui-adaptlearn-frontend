import React, { useCallback, useEffect, useMemo } from "react";
import {
  Link,
  matchPath,
  useHistory,
  useLocation as useRouterLocation,
  useParams as useRouterParams,
} from "react-router-dom";
import PropTypes from "prop-types";

/**
 * 独立包由 HashRouter 提供唯一的路由状态；该组件保留模块的宿主接口，
 * 使页面代码不需要感知独立运行和主项目挂载方式的差异。
 */
export function RoutingProvider({ children }) {
  return <>{children}</>;
}

RoutingProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useLocation() {
  return useRouterLocation();
}

export function useParams() {
  return useRouterParams();
}

export function useNavigate() {
  const history = useHistory();
  return useCallback(
    (to, options = {}) => {
      if (typeof to === "number") {
        history.go(to);
        return;
      }
      const method = options.replace ? history.replace : history.push;
      method(to, options.state);
    },
    [history],
  );
}

function searchStringFrom(initializer) {
  const parameters =
    initializer instanceof URLSearchParams
      ? initializer
      : new URLSearchParams(initializer);
  const value = parameters.toString();
  return value ? `?${value}` : "";
}

export function useSearchParams() {
  const history = useHistory();
  const location = useRouterLocation();
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const setSearchParams = useCallback(
    (nextInitializer, options = {}) => {
      const current = new URLSearchParams(location.search);
      const next =
        typeof nextInitializer === "function"
          ? nextInitializer(current)
          : nextInitializer;
      const destination = {
        ...location,
        search: searchStringFrom(next),
        state: options.state,
      };
      const method = options.replace ? history.replace : history.push;
      method(destination);
    },
    [history, location],
  );
  return [searchParams, setSearchParams];
}

export function Navigate({ to, replace = false, state }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace, state });
  }, [navigate, replace, state, to]);
  return null;
}

Navigate.propTypes = {
  replace: PropTypes.bool,
  state: PropTypes.object,
  to: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({ pathname: PropTypes.string.isRequired }),
  ]).isRequired,
};

export function NavLink({
  to,
  end = false,
  className,
  style,
  children,
  ...properties
}) {
  const location = useRouterLocation();
  const targetPath =
    typeof to === "string" ? to.split(/[#?]/, 1)[0] : to.pathname;
  const isActive = Boolean(
    matchPath(location.pathname, { path: targetPath, exact: end }),
  );
  const state = { isActive };
  return (
    <Link
      {...properties}
      to={to}
      className={typeof className === "function" ? className(state) : className}
      style={typeof style === "function" ? style(state) : style}
      aria-current={isActive ? "page" : undefined}
    >
      {typeof children === "function" ? children(state) : children}
    </Link>
  );
}

NavLink.propTypes = {
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]).isRequired,
  className: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  end: PropTypes.bool,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  to: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({ pathname: PropTypes.string.isRequired }),
  ]).isRequired,
};

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { Link, matchPath } from "dva/router";
import PropTypes from "prop-types";

const RoutingContext = createContext(null);

/**
 *
 * @param root0
 * @param root0.children
 * @param root0.route
 */
export function RoutingProvider({ children, route }) {
  return (
    <RoutingContext.Provider value={route}>{children}</RoutingContext.Provider>
  );
}

RoutingProvider.propTypes = {
  children: PropTypes.node.isRequired,
  route: PropTypes.shape({
    history: PropTypes.shape({
      go: PropTypes.func.isRequired,
      push: PropTypes.func.isRequired,
      replace: PropTypes.func.isRequired,
    }).isRequired,
    location: PropTypes.shape({
      hash: PropTypes.string.isRequired,
      pathname: PropTypes.string.isRequired,
      search: PropTypes.string.isRequired,
    }).isRequired,
    match: PropTypes.shape({ params: PropTypes.objectOf(PropTypes.string) })
      .isRequired,
  }).isRequired,
};

/**
 *
 */
function useRoutingContext() {
  const context = useContext(RoutingContext);
  if (!context) throw new Error("自适应学习路由必须在 RoutingProvider 中使用");
  return context;
}

/**
 *
 */
export function useLocation() {
  return useRoutingContext().location;
}

/**
 *
 */
export function useParams() {
  return useRoutingContext().match?.params || {};
}

/**
 *
 */
export function useNavigate() {
  const { history } = useRoutingContext();
  return useCallback(
    (to, options = {}) => {
      if (typeof to === "number") {
        history.go(to);
        return;
      }
      const method = options.replace ? history.replace : history.push;
      if (typeof to === "string") {
        method(to, options.state);
        return;
      }
      method({
        ...to,
        state: options.state === undefined ? to.state : options.state,
      });
    },
    [history],
  );
}

/**
 *
 * @param init
 */
function searchStringFrom(init) {
  const params =
    init instanceof URLSearchParams ? init : new URLSearchParams(init);
  const value = params.toString();
  return value ? `?${value}` : "";
}

/**
 *
 */
export function useSearchParams() {
  const { history, location } = useRoutingContext();
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const setSearchParams = useCallback(
    (nextInit, options = {}) => {
      // Setter 接受函数时传入副本，避免调用方意外修改当前 location 对应的实例。
      const current = new URLSearchParams(location.search);
      const next =
        typeof nextInit === "function" ? nextInit(current) : nextInit;
      const destination = {
        pathname: location.pathname,
        search: searchStringFrom(next),
        hash: location.hash,
        state: options.state,
      };
      const method = options.replace ? history.replace : history.push;
      method(destination);
    },
    [history, location.hash, location.pathname, location.search],
  );
  return [searchParams, setSearchParams];
}

/**
 *
 * @param root0
 * @param root0.to
 * @param root0.replace
 * @param root0.state
 */
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

/**
 *
 * @param root0
 * @param root0.to
 * @param root0.end
 * @param root0.className
 * @param root0.style
 * @param root0.children
 */
export function NavLink({
  to,
  end = false,
  className,
  style,
  children,
  ...properties
}) {
  const location = useLocation();
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

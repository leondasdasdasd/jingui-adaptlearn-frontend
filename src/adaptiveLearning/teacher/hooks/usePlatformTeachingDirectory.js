import { useState } from "react";

export function usePlatformTeachingDirectory() {
  const [directory] = useState([]);
  const [loading] = useState(false);
  return { directory, loading };
}

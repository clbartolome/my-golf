import { useEffect, useState } from "react";
import { api } from "../api/client";
import { DEFAULT_CLUBS } from "../constants";

export function useBag() {
  const [clubs, setClubs] = useState<string[]>([...DEFAULT_CLUBS]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .bag()
      .then((b) => setClubs(b.map((c) => c.name)))
      .catch(() => setClubs([...DEFAULT_CLUBS]))
      .finally(() => setLoading(false));
  }, []);

  return { clubs, loading, setClubs };
}

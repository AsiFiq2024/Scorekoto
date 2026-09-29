"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState({
    teams: [],
    players: [],
    leagues: [],
  });
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem("scorekoto-favorites");
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.error("Failed to parse saved favorites:", e);
      }
    }
    setLoaded(true);
  }, []);

  // Keep database-backed favorites in sync when a user signs in.
  const fetchDbFavorites = useCallback(async () => {
    if (!user) return;

    try {
      const [teamsResponse, leaguesResponse] = await Promise.all([
        fetch("/api/favorites/teams", { cache: "no-store" }),
        fetch("/api/favorites/leagues", { cache: "no-store" }),
      ]);

      const updates = {};

      if (teamsResponse.ok) {
        const data = await teamsResponse.json();
        if (data.success) {
          updates.teams = Array.from(
            new Set([
              ...(data.slugs || []),
              ...(data.teamIds || []).map(String),
            ])
          );
        }
      }

      if (leaguesResponse.ok) {
        const data = await leaguesResponse.json();
        if (data.success) {
          updates.leagues = Array.from(
            new Set([
              ...(data.slugs || []),
              ...(data.leagueIds || []).map(String),
            ])
          );
        }
      }

      if (Object.keys(updates).length > 0) {
        setFavorites((previousFavorites) => ({
          ...previousFavorites,
          ...updates,
        }));
      }
    } catch (err) {
      console.error("Failed to fetch database favorites:", err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchDbFavorites();
    }
  }, [user, fetchDbFavorites]);

  // Sync to localStorage
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("scorekoto-favorites", JSON.stringify(favorites));
  }, [favorites, loaded]);

  function isFavorite(type, id) {
    if (!favorites[type]) return false;
    const strId = String(id).toLowerCase();
    return favorites[type].some(
      (item) => String(item).toLowerCase() === strId || item === id
    );
  }

  async function toggleFavorite(type, id) {
    const alreadyFavorite = isFavorite(type, id);

    // Optimistically update local state
    setFavorites((currentFavorites) => {
      const currentList = currentFavorites[type] || [];
      const strId = String(id).toLowerCase();

      if (alreadyFavorite) {
        return {
          ...currentFavorites,
          [type]: currentList.filter(
            (item) => String(item).toLowerCase() !== strId && item !== id
          ),
        };
      }

      return {
        ...currentFavorites,
        [type]: [...currentList, id],
      };
    });

    const persistenceConfig = {
      teams: {
        endpoint: "/api/favorites/teams",
        queryKey: "teamId",
        createBody: { teamSlug: id, teamId: id },
      },
      leagues: {
        endpoint: "/api/favorites/leagues",
        queryKey: "leagueId",
        createBody: { leagueSlug: id, leagueId: id },
      },
    }[type];

    // Signed-in team and league favorites are stored in PostgreSQL.
    if (user && persistenceConfig) {
      try {
        let response;
        if (alreadyFavorite) {
          response = await fetch(
            `${persistenceConfig.endpoint}?${persistenceConfig.queryKey}=${encodeURIComponent(id)}`,
            {
            method: "DELETE",
            }
          );
        } else {
          response = await fetch(persistenceConfig.endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(persistenceConfig.createBody),
          });
        }

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `Failed to update favorite ${type}`);
        }

        await fetchDbFavorites();
        window.dispatchEvent(new Event("scorekoto:favorites-updated"));
      } catch (err) {
        console.error("Failed to update favorite in database:", err);

        // Restore the previous UI state when persistence fails.
        setFavorites((currentFavorites) => {
          const currentList = currentFavorites[type] || [];
          const strId = String(id).toLowerCase();

          if (alreadyFavorite) {
            const exists = currentList.some(
              (item) => String(item).toLowerCase() === strId
            );
            return exists
              ? currentFavorites
              : { ...currentFavorites, [type]: [...currentList, id] };
          }

          return {
            ...currentFavorites,
            [type]: currentList.filter(
              (item) => String(item).toLowerCase() !== strId
            ),
          };
        });
      }
    }
  }

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isFavorite,
        toggleFavorite,
        loaded,
        refreshFavorites: fetchDbFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}

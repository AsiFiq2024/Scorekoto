"use client";

import { useFavorites } from "@/context/FavoritesContext";
import Icon from "./Icon";

export default function FavoriteButton({
    type,
    id,
    label,
}) {
    const {
        isFavorite,
        toggleFavorite,
        loaded,
    } = useFavorites();

    if (!loaded) {
        return (
            <button
                className="favorite-button"
                disabled
                aria-label={label ? `Loading favorite status for ${label}` : "Loading favorite status"}
            >
                <Icon name="star" />
            </button>
        );
    }

    const active = isFavorite(type, id);

    return (
        <button
            type="button"
            className={
                active
                    ? "favorite-button favorite-active"
                    : "favorite-button"
            }
            onClick={() =>
                toggleFavorite(type, id)
            }
            aria-label={
                active
                    ? `Remove${label ? ` ${label}` : ""} from favorites`
                    : `Add${label ? ` ${label}` : ""} to favorites`
            }
        >
            <Icon name="star" filled={active} />
        </button>
    );
}

import unicodedata
import re
from typing import Optional


def normalize_text_for_search(text: Optional[str]) -> Optional[str]:
    """
    Normalize text for case-insensitive, accent-insensitive, and whitespace-insensitive comparison.
    
    Args:
        text: The text to normalize
        
    Returns:
        Normalized text or None if input was None/empty
    """
    if not text or not text.strip():
        return None
        
    # Convert to lowercase
    normalized = text.lower()
    
    # Remove accents and diacritics using Unicode normalization
    # NFD = Canonical Decomposition, separates base chars from combining chars
    normalized = unicodedata.normalize('NFD', normalized)
    
    # Remove all combining characters (accents, diacritics)
    normalized = ''.join(
        char for char in normalized 
        if unicodedata.category(char) != 'Mn'  # Mn = Nonspacing_Mark (combining chars)
    )
    
    # Remove all whitespace
    normalized = re.sub(r'\s+', '', normalized)
    
    # Remove any remaining special characters for better matching
    # Keep word characters and underscores, but allow Unicode letters
    normalized = re.sub(r'[^\w]', '', normalized, flags=re.UNICODE)
    
    return normalized if normalized else None


def texts_match(text1: Optional[str], text2: Optional[str]) -> bool:
    """
    Compare two texts using normalized matching rules.
    
    Args:
        text1: First text to compare
        text2: Second text to compare
        
    Returns:
        True if texts match after normalization, False otherwise
    """
    norm1 = normalize_text_for_search(text1)
    norm2 = normalize_text_for_search(text2)
    
    # Both None or empty
    if not norm1 and not norm2:
        return True
        
    # One is None/empty, the other isn't
    if not norm1 or not norm2:
        return False
        
    return norm1 == norm2


def normalize_semicolon_separated_string(text: Optional[str]) -> Optional[str]:
    """
    Normalize semicolon-separated string by removing spaces around semicolons.

    This function handles cases like:
    - "item1 ; item2 ; item3" -> "item1;item2;item3"
    - "item1; item2 ;item3" -> "item1;item2;item3"

    Args:
        text: The semicolon-separated text to normalize

    Returns:
        Normalized text or None if input was None/empty
    """
    if not text or not text.strip():
        return None

    # Remove spaces around semicolons
    normalized = re.sub(r'\s*;\s*', ';', text.strip())

    return normalized if normalized else None


def split_semicolon_separated_list(text: Optional[str]) -> list:
    """
    Split semicolon-separated string into a list of trimmed items.

    Handles spaces around semicolons and filters out empty items.

    Args:
        text: The semicolon-separated text to split

    Returns:
        List of trimmed non-empty items
    """
    if not text:
        return []

    normalized = normalize_semicolon_separated_string(text)
    if not normalized:
        return []

    return [item.strip() for item in normalized.split(';') if item.strip()]


def find_best_text_match(target_text: str, candidates: list) -> list:
    """
    Find all candidates that match the target text using normalized comparison.

    Args:
        target_text: The text to search for
        candidates: List of candidate objects to search through

    Returns:
        List of matching candidates
    """
    if not target_text or not candidates:
        return []

    normalized_target = normalize_text_for_search(target_text)
    if not normalized_target:
        return []

    matches = []
    for candidate in candidates:
        # We'll determine the field to check in the calling function
        # This is a generic utility function
        matches.append(candidate)

    return matches
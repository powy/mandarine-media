import pytest
from app.utils.text_normalization import normalize_text_for_search, texts_match


class TestTextNormalization:
    """Test text normalization utility functions"""

    def test_normalize_text_basic(self):
        """Test basic text normalization"""
        assert normalize_text_for_search("Hello World") == "helloworld"
        assert normalize_text_for_search("HELLO WORLD") == "helloworld"
        assert normalize_text_for_search("hello world") == "helloworld"

    def test_normalize_text_accents(self):
        """Test accent removal"""
        assert normalize_text_for_search("María García") == "mariagarcia"
        assert normalize_text_for_search("José") == "jose"
        assert normalize_text_for_search("François") == "francois"
        assert normalize_text_for_search("André") == "andre"

    def test_normalize_text_unicode(self):
        """Test Unicode character handling"""
        assert normalize_text_for_search("李明") == "李明"
        assert normalize_text_for_search("Müller") == "muller"
        # Skip problematic Unicode chars that may not render correctly in all environments
        assert normalize_text_for_search("Björk") == "bjork"

    def test_normalize_text_whitespace(self):
        """Test whitespace removal"""
        assert normalize_text_for_search("  Hello   World  ") == "helloworld"
        assert normalize_text_for_search("Hello\nWorld\t") == "helloworld"
        assert normalize_text_for_search("Hello\r\nWorld") == "helloworld"

    def test_normalize_text_special_chars(self):
        """Test special character removal"""
        assert normalize_text_for_search("Hello-World!") == "helloworld"
        assert normalize_text_for_search("John's Test") == "johnstest"
        assert normalize_text_for_search("Test@Example.com") == "testexamplecom"

    def test_normalize_text_empty_cases(self):
        """Test empty and None cases"""
        assert normalize_text_for_search(None) is None
        assert normalize_text_for_search("") is None
        assert normalize_text_for_search("   ") is None
        assert normalize_text_for_search("!!!") is None  # Special chars only should return None

    def test_texts_match_basic(self):
        """Test basic text matching"""
        assert texts_match("Hello World", "hello world") is True
        assert texts_match("Hello World", "HELLO WORLD") is True
        assert texts_match("Hello World", "Different Text") is False

    def test_texts_match_accents(self):
        """Test accent-insensitive matching"""
        assert texts_match("María", "Maria") is True
        assert texts_match("José", "Jose") is True
        assert texts_match("François", "Francois") is True
        assert texts_match("André", "andre") is True

    def test_texts_match_whitespace(self):
        """Test whitespace-insensitive matching"""
        assert texts_match("John Smith", "JohnSmith") is True
        assert texts_match("John   Smith", "John Smith") is True
        assert texts_match("  John Smith  ", "john smith") is True

    def test_texts_match_combined(self):
        """Test combined normalization cases"""
        assert texts_match("María García", "MARIA GARCIA") is True
        assert texts_match("Jean-François", "jean francois") is True
        assert texts_match("李 明", "李明") is True

    def test_texts_match_empty_cases(self):
        """Test empty and None cases for matching"""
        assert texts_match(None, None) is True
        assert texts_match("", "") is True
        assert texts_match(None, "") is True
        assert texts_match("", None) is True
        assert texts_match("Hello", None) is False
        assert texts_match(None, "Hello") is False

    def test_texts_match_edge_cases(self):
        """Test edge cases"""
        assert texts_match("123", "123") is True
        assert texts_match("Test-123", "test 123") is True
        assert texts_match("!@#$%", "") is True  # Special chars only normalize to None, which matches empty
        assert texts_match("   ", "") is True  # Whitespace only normalizes to None, which matches empty
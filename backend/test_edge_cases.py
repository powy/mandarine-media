#!/usr/bin/env python3
"""
Test script to verify edge cases in the get_most_restrictive_policy_and_id function.
Tests various scenarios that might cause the file_url to be None.
"""

def test_get_most_restrictive_policy_and_id():
    """Test the policy selection logic with various edge cases."""
    
    # Mock the function logic (extracted from mux.py)
    def get_most_restrictive_policy_and_id(playback_ids):
        if not playback_ids:
            return None, None
        
        # Policy hierarchy: drm > signed > public
        policy_priority = {"drm": 3, "signed": 2, "public": 1}
        most_restrictive = None
        best_priority = 0
        
        for pb in playback_ids:
            policy = pb.policy if hasattr(pb, 'policy') else 'public'
            priority = policy_priority.get(policy, 1)
            print(f"    Evaluating playback ID {pb.id}: policy={policy}, priority={priority}")
            if priority > best_priority:
                best_priority = priority
                most_restrictive = pb
                print(f"    New most restrictive: id={pb.id}, policy={policy}, priority={priority}")
        
        final_policy = most_restrictive.policy if most_restrictive and hasattr(most_restrictive, 'policy') else 'public'
        final_id = most_restrictive.id if most_restrictive else playback_ids[0].id
        print(f"    Final selection: policy={final_policy}, id={final_id}, most_restrictive={most_restrictive is not None}")
        return final_policy, final_id
    
    # Mock playback ID class
    class MockPlaybackId:
        def __init__(self, id, policy=None):
            self.id = id
            if policy is not None:
                self.policy = policy
    
    print("Testing get_most_restrictive_policy_and_id edge cases")
    print("=" * 60)
    
    # Test Case 1: Empty playback IDs
    print("\nTest Case 1: Empty playback IDs")
    policy, pb_id = get_most_restrictive_policy_and_id([])
    print(f"  Result: policy={policy}, id={pb_id}")
    file_url = f"https://stream.mux.com/{pb_id}.m3u8" if pb_id else None
    print(f"  Generated file_url: {file_url}")
    print(f"  Would file_url be saved? {'Yes' if file_url else 'No'}")
    
    # Test Case 2: Single playback ID with no policy attribute
    print("\nTest Case 2: Single playback ID with no policy attribute")
    mock_pb = MockPlaybackId("test123")  # No policy attribute
    policy, pb_id = get_most_restrictive_policy_and_id([mock_pb])
    print(f"  Result: policy={policy}, id={pb_id}")
    file_url = f"https://stream.mux.com/{pb_id}.m3u8" if pb_id else None
    print(f"  Generated file_url: {file_url}")
    print(f"  Would file_url be saved? {'Yes' if file_url else 'No'}")
    
    # Test Case 3: Single playback ID with 'public' policy
    print("\nTest Case 3: Single playback ID with 'public' policy")
    mock_pb = MockPlaybackId("test456", "public")
    policy, pb_id = get_most_restrictive_policy_and_id([mock_pb])
    print(f"  Result: policy={policy}, id={pb_id}")
    file_url = f"https://stream.mux.com/{pb_id}.m3u8" if pb_id else None
    print(f"  Generated file_url: {file_url}")
    print(f"  Would file_url be saved? {'Yes' if file_url else 'No'}")
    
    # Test Case 4: Single playback ID with 'signed' policy
    print("\nTest Case 4: Single playback ID with 'signed' policy")
    mock_pb = MockPlaybackId("test789", "signed")
    policy, pb_id = get_most_restrictive_policy_and_id([mock_pb])
    print(f"  Result: policy={policy}, id={pb_id}")
    file_url = f"https://stream.mux.com/{pb_id}.m3u8" if pb_id else None
    print(f"  Generated file_url: {file_url}")
    print(f"  Would file_url be saved? {'Yes' if file_url else 'No'}")
    
    # Test Case 5: Single playback ID with 'drm' policy
    print("\nTest Case 5: Single playback ID with 'drm' policy")
    mock_pb = MockPlaybackId("test999", "drm")
    policy, pb_id = get_most_restrictive_policy_and_id([mock_pb])
    print(f"  Result: policy={policy}, id={pb_id}")
    file_url = f"https://stream.mux.com/{pb_id}.m3u8" if pb_id else None
    print(f"  Generated file_url: {file_url}")
    print(f"  Would file_url be saved? {'Yes' if file_url else 'No'}")
    
    # Test Case 6: Multiple playback IDs with mixed policies
    print("\nTest Case 6: Multiple playback IDs with mixed policies")
    playback_ids = [
        MockPlaybackId("public123", "public"),
        MockPlaybackId("signed456", "signed"),
        MockPlaybackId("drm789", "drm")
    ]
    policy, pb_id = get_most_restrictive_policy_and_id(playback_ids)
    print(f"  Result: policy={policy}, id={pb_id}")
    file_url = f"https://stream.mux.com/{pb_id}.m3u8" if pb_id else None
    print(f"  Generated file_url: {file_url}")
    print(f"  Would file_url be saved? {'Yes' if file_url else 'No'}")
    
    # Test Case 7: Playback ID with unknown policy
    print("\nTest Case 7: Playback ID with unknown policy")
    mock_pb = MockPlaybackId("unknown123", "unknown_policy")
    policy, pb_id = get_most_restrictive_policy_and_id([mock_pb])
    print(f"  Result: policy={policy}, id={pb_id}")
    file_url = f"https://stream.mux.com/{pb_id}.m3u8" if pb_id else None
    print(f"  Generated file_url: {file_url}")
    print(f"  Would file_url be saved? {'Yes' if file_url else 'No'}")
    
    # Test Case 8: Playback ID with empty string ID
    print("\nTest Case 8: Playback ID with empty string ID")
    mock_pb = MockPlaybackId("", "public")
    policy, pb_id = get_most_restrictive_policy_and_id([mock_pb])
    print(f"  Result: policy={policy}, id={pb_id}")
    file_url = f"https://stream.mux.com/{pb_id}.m3u8" if pb_id else None
    print(f"  Generated file_url: {file_url}")
    print(f"  Would file_url be saved? {'Yes' if file_url else 'No'}")
    
    # Test Case 9: Playback ID with None ID
    print("\nTest Case 9: Playbook ID with None ID")
    mock_pb = MockPlaybackId(None, "public")
    policy, pb_id = get_most_restrictive_policy_and_id([mock_pb])
    print(f"  Result: policy={policy}, id={pb_id}")
    file_url = f"https://stream.mux.com/{pb_id}.m3u8" if pb_id else None
    print(f"  Generated file_url: {file_url}")
    print(f"  Would file_url be saved? {'Yes' if file_url else 'No'}")
    
    print("\n" + "=" * 60)
    print("Edge case testing complete!")

if __name__ == "__main__":
    test_get_most_restrictive_policy_and_id()
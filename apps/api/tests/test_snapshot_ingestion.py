from pathlib import Path

from apps.api.app.ingestion.frammer_snapshot import build_snapshot
from apps.api.app.ingestion.sql_dump import read_selected_inserts


def write_dump(tmp_path: Path) -> Path:
    dump = tmp_path / "snapshot.sql"
    dump.write_text(
        """
INSERT INTO `company` (`id`, `name`, `status`, `meta_data`) VALUES
(1, 'Example Co', 1, '{\"secret\":\"ignore\"}');
INSERT INTO `channel` (`id`, `company_id`, `name`, `status`, `notification_email`) VALUES
(2, 1, 'Main', 1, 'private@example.com');
INSERT INTO `users` (`id`, `name`, `email`, `status`) VALUES
(3, 'Editor', 'editor@example.com', 1);
INSERT INTO `videos` (`id`, `user_id`, `company_id`, `channel_id`, `video_md5`, `url`, `headline`, `filename`, `language`, `duration`, `status`, `date_added`, `date_updated`, `process_start`, `process_end`, `parent_video_id`, `video_type`, `url_type`, `total_time_taken`, `is_deleted`, `published`, `is_billable`) VALUES
(10, 3, 1, 2, 'master', 'https://example.test/master', 'Master', 'master.mp4', 'en', 120, 3, '2026-01-01 00:00:00', '2026-01-01 00:01:00', '2026-01-01 00:00:00', '2026-01-01 00:01:00', 0, 'original', 'upload', 60, 0, 1, 1),
(11, 3, 99, 2, 'child', 'https://example.test/child', 'Child', 'child.mp4', 'en', 30, 10, '2026-01-01 00:00:00', '2026-01-01 00:01:00', NULL, NULL, 10, 'viral', 'child', 0, 0, 0, 1);
INSERT INTO `md_child_metadata` (`video_id`, `caption`, `hashtag`, `synopsis`, `subtitles`, `thumbnails`, `characters`, `credentials`) VALUES
(11, 'caption', '#tag', 'synopsis', 'subtitles', 'thumb', 'characters', 'never-store');
INSERT INTO `services_requested` (`id`, `video_id`, `service_type_id`, `initiated_by`, `start_time`, `end_time`, `status`, `duration`, `date_added`, `date_updated`, `published`, `video_replaced`, `data`) VALUES
(20, 0, 'transcript', 'user', '2026-01-01 00:00:00', NULL, 7, NULL, '2026-01-01 00:00:00', '2026-01-01 00:00:00', 0, 2, 'never-store');
INSERT INTO `video_publish_schedulers` (`id`, `user_id`, `company_id`, `channel_id`, `video_id`, `status`, `platform_type`, `scheduled_time`, `destination_id`, `is_deleted`) VALUES
(30, 3, 1, 2, 'master', 2, ' facebook-reels', '2026-01-02 00:00:00', NULL, 0);
INSERT INTO `video_clipcut_club_requests` (`request_id`, `user_id`, `video_md5`, `aspect_ratio_type`, `series_name`, `status`, `create_time`, `update_time`) VALUES
(40, 3, 'clipcut-domain', '9:16', 'Series', 3, '2026-01-01 00:00:00', '2026-01-01 00:00:00');
INSERT INTO `trendings` (`id`, `name`, `type`, `trending_date`, `country`, `orders`) VALUES
(50, 'Topic', 'youtube', '2024-04-26 00:00:00', NULL, 1);
""",
        encoding="utf-8",
    )
    return dump


def test_safe_projection_omits_sensitive_columns(tmp_path: Path) -> None:
    rows = read_selected_inserts(write_dump(tmp_path), {"users": {"id", "name", "status"}})

    assert rows["users"] == [{"id": "3", "name": "Editor", "status": "1"}]
    assert "email" not in rows["users"][0]


def test_snapshot_normalizes_and_records_quality_issues(tmp_path: Path) -> None:
    bundle = build_snapshot(write_dump(tmp_path))

    assert bundle.schedules[0]["publish_platform"] == "facebook-reels"
    assert bundle.lineage == [
        {"child_video_source_id": 11, "parent_video_source_id": 10, "child_video_type": "viral"}
    ]
    assert bundle.videos[1]["metadata_caption_present"] is True
    assert bundle.services[0]["video_replaced_count"] == 2
    codes = {issue["issue_code"] for issue in bundle.issues}
    assert "unknown_video_status" in codes
    assert "unknown_service_status" in codes
    assert "sentinel_video_id" in codes
    assert "normalized_publish_platform" in codes
    assert "orphan_reference" in codes
